"""PRIVATE admin API, called server-to-server by SecureAccess (never by a browser).

Every route requires a short-lived token signed by SecureAccess (see deps.require_admin).
Food Atlas does not call SecureAccess: it only verifies the signature, so normal browsing
and submitting keep working even if SecureAccess is offline."""
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query

from .. import submissions as svc
from ..db import restaurants, submissions
from ..deps import require_admin
from ..schemas import RejectIn

router = APIRouter(
    prefix="/api/internal/admin/submissions",
    tags=["internal admin"],
    dependencies=[Depends(require_admin)],
)


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Submission not found")


def _admin_by(admin: dict) -> dict:
    return {"id": admin["id"], "username": admin["username"], "role": admin["role"]}


@router.get("")
def list_submissions(
    status: str = Query("pending", pattern="^(pending|approved|rejected|withdrawn|all)$"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    query = {} if status == "all" else {"status": status}
    order = 1 if status == "pending" else -1  # oldest pending first; history newest first
    docs = list(submissions.find(query).sort("submitted_at", order).skip(skip).limit(limit))

    # Flag approved items whose public record is missing (a crash between "decision saved"
    # and "published"). The admin can press approve again to repair it.
    approved_ids = [d["_id"] for d in docs if d["status"] == svc.APPROVED]
    published = {r["_id"] for r in restaurants.find({"_id": {"$in": approved_ids}}, {"_id": 1})} if approved_ids else set()

    items = []
    for d in docs:
        view = svc.admin_view(d)
        if d["status"] == svc.APPROVED:
            view["published"] = d["_id"] in published
        items.append(view)
    return {"items": items, "total": submissions.count_documents(query)}


@router.get("/{submission_id}")
def get_submission(submission_id: str):
    doc = submissions.find_one({"_id": _oid(submission_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
    return svc.admin_view(doc)


@router.post("/{submission_id}/approve")
def approve_submission(submission_id: str, admin: dict = Depends(require_admin)):
    try:
        doc, changed = svc.approve(submissions, restaurants, _oid(submission_id), _admin_by(admin))
    except svc.NotFound:
        raise HTTPException(status_code=404, detail="Submission not found")
    except svc.Conflict as exc:
        raise HTTPException(status_code=409, detail=f"This submission was already {exc.status}.")
    return {"changed": changed, "submission": svc.admin_view(doc)}


@router.post("/{submission_id}/reject")
def reject_submission(submission_id: str, body: RejectIn, admin: dict = Depends(require_admin)):
    try:
        doc, changed = svc.reject(submissions, _oid(submission_id), _admin_by(admin), body.reason)
    except svc.NotFound:
        raise HTTPException(status_code=404, detail="Submission not found")
    except svc.Conflict as exc:
        raise HTTPException(status_code=409, detail=f"This submission was already {exc.status}.")
    return {"changed": changed, "submission": svc.admin_view(doc)}
