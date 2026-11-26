"""Endpoints for signed-in users: submit a place, see my submissions, withdraw one.

Identity (uid/email/name) always comes from the verified Firebase token, never from the
request body. Submissions are stored as `pending` and are invisible to the public."""
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from .. import submissions as svc
from ..config import get_settings
from ..db import submissions
from ..deps import require_user
from ..schemas import SubmissionIn

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Submission not found")


def _data(body: SubmissionIn) -> dict:
    data = body.model_dump(mode="json", exclude={"lat", "lng"})
    data["location"] = {"type": "Point", "coordinates": [body.lng, body.lat]}
    return data


@router.post("", status_code=201)
def submit_restaurant(body: SubmissionIn, user: dict = Depends(require_user)):
    s = get_settings()
    try:
        doc = svc.create(
            submissions,
            _data(body),
            {"uid": user["uid"], "email": user["email"], "name": user["name"]},
            max_pending=s.max_pending_per_user,
            max_per_day=s.max_submissions_per_day,
        )
    except svc.Duplicate as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except svc.LimitExceeded as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    return {
        "id": str(doc["_id"]),
        "status": svc.PENDING,
        "message": "Thanks! Your place was sent for review. It will appear on Food Atlas once approved.",
    }


@router.get("/mine")
def my_submissions(user: dict = Depends(require_user)):
    cursor = submissions.find({"submitter.uid": user["uid"]}).sort("submitted_at", -1).limit(100)
    return {"items": [svc.user_view(d) for d in cursor]}


@router.delete("/{submission_id}")
def withdraw_submission(submission_id: str, user: dict = Depends(require_user)):
    try:
        doc = svc.withdraw(submissions, _oid(submission_id), user["uid"])
    except svc.NotFound:
        raise HTTPException(status_code=404, detail="Submission not found")
    except svc.Conflict as exc:
        raise HTTPException(status_code=409, detail=f"This submission is already {exc.status}.")
    return svc.user_view(doc)
