"""Restaurant submission workflow (the rules live here, not in the route handlers).

Life of a submission:

    pending --approve--> approved   (restaurant copied into the public collection)
    pending --reject---> rejected   (never published; reason kept)
    pending --withdraw-> withdrawn  (by the submitter)

Only `pending` can change. Each change is ONE atomic database update whose filter
includes `status: "pending"`, so two admins clicking at once cannot both win.

Pending data lives only in `restaurant_submissions`. The public `restaurants`
collection never contains unapproved data, so no public query needs a status filter.

No FastAPI/pymongo imports here, so the rules can be tested without a database.
"""
from datetime import datetime, timedelta, timezone

PENDING, APPROVED, REJECTED, WITHDRAWN = "pending", "approved", "rejected", "withdrawn"
STATUSES = (PENDING, APPROVED, REJECTED, WITHDRAWN)

AFTER = True  # identical to pymongo.ReturnDocument.AFTER (kept literal: no pymongo import)


class SubmissionError(Exception):
    pass


class NotFound(SubmissionError):
    pass


class Conflict(SubmissionError):
    def __init__(self, status: str):
        super().__init__(status)
        self.status = status


class LimitExceeded(SubmissionError):
    pass


class Duplicate(SubmissionError):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _name_key(name: str) -> str:
    return " ".join(name.lower().split())


# --------------------------------------------------------------------------- submitting
def check_limits(subs, uid: str, name_key: str, *, max_pending: int, max_per_day: int, now=None) -> None:
    now = now or utcnow()
    if subs.count_documents({"submitter.uid": uid, "status": PENDING}) >= max_pending:
        raise LimitExceeded(
            f"You already have {max_pending} places waiting for review. "
            "Please wait for a decision or withdraw one."
        )
    since = now - timedelta(hours=24)
    if subs.count_documents({"submitter.uid": uid, "submitted_at": {"$gte": since}}) >= max_per_day:
        raise LimitExceeded("Daily submission limit reached. Please try again tomorrow.")
    if subs.count_documents({"submitter.uid": uid, "status": PENDING, "name_key": name_key}):
        raise Duplicate("You already submitted a place with this name and it is still waiting for review.")


def create(subs, data: dict, submitter: dict, *, max_pending: int, max_per_day: int) -> dict:
    """`submitter` comes from the verified Firebase token, never from the request body."""
    t = utcnow()
    key = _name_key(data["name"])
    check_limits(subs, submitter["uid"], key, max_pending=max_pending, max_per_day=max_per_day, now=t)
    doc = {
        "status": PENDING,
        "data": data,
        "name_key": key,
        "submitter": {"uid": submitter["uid"], "email": submitter["email"], "name": submitter.get("name", "")},
        "submitted_at": t,
        "updated_at": t,
        "decision": None,
        "restaurant_id": None,
        "history": [{"event": "submitted", "at": t, "by": {"type": "user", "uid": submitter["uid"]}}],
    }
    subs.insert_one(doc)  # pymongo adds doc["_id"]
    return doc


def withdraw(subs, sub_id, uid: str) -> dict:
    t = utcnow()
    doc = subs.find_one_and_update(
        {"_id": sub_id, "submitter.uid": uid, "status": PENDING},
        {
            "$set": {"status": WITHDRAWN, "updated_at": t},
            "$push": {"history": {"event": "withdrawn", "at": t, "by": {"type": "user", "uid": uid}}},
        },
        return_document=AFTER,
    )
    if doc is not None:
        return doc
    existing = subs.find_one({"_id": sub_id, "submitter.uid": uid})
    if existing is None:  # not found OR not yours: same answer, so IDs can't be probed
        raise NotFound()
    raise Conflict(existing["status"])


# --------------------------------------------------------------------------- admin decisions
def public_doc(sub: dict) -> dict:
    """What becomes visible to everyone. Built from the whitelisted `data` only:
    no submitter identity, no review notes."""
    t = utcnow()
    doc = dict(sub["data"])
    doc["images"] = [doc["image"]] if doc.get("image") else []
    doc.update(rating=0, review_count=0, created_at=t, updated_at=t, submission_id=str(sub["_id"]))
    return doc


def publish(rests, sub: dict) -> None:
    """Idempotent: the public restaurant reuses the submission's _id, and $setOnInsert
    means running this twice changes nothing. That makes a retry after a crash safe."""
    rests.update_one({"_id": sub["_id"]}, {"$setOnInsert": public_doc(sub)}, upsert=True)


def approve(subs, rests, sub_id, admin: dict) -> tuple[dict, bool]:
    """Returns (submission, changed). Order matters:
      1. atomically claim the decision (pending -> approved)  <- the gate
      2. publish (idempotent)
    If step 2 fails, the submission is already 'approved' and approving again repairs it.
    Publishing BEFORE the gate could leave a rejected place public."""
    t = utcnow()
    by = {"type": "admin", "id": admin["id"], "username": admin["username"], "role": admin["role"]}
    claimed = subs.find_one_and_update(
        {"_id": sub_id, "status": PENDING},
        {
            "$set": {
                "status": APPROVED,
                "decision": {"by": by, "at": t, "reason": None},
                "restaurant_id": sub_id,
                "updated_at": t,
            },
            "$push": {"history": {"event": "approved", "at": t, "by": by}},
        },
        return_document=AFTER,
    )
    if claimed is not None:
        publish(rests, claimed)
        return claimed, True

    existing = subs.find_one({"_id": sub_id})
    if existing is None:
        raise NotFound()
    if existing["status"] == APPROVED:
        publish(rests, existing)  # repair a half-finished earlier approval
        return existing, False
    raise Conflict(existing["status"])


def reject(subs, sub_id, admin: dict, reason: str) -> tuple[dict, bool]:
    t = utcnow()
    by = {"type": "admin", "id": admin["id"], "username": admin["username"], "role": admin["role"]}
    claimed = subs.find_one_and_update(
        {"_id": sub_id, "status": PENDING},
        {
            "$set": {"status": REJECTED, "decision": {"by": by, "at": t, "reason": reason}, "updated_at": t},
            "$push": {"history": {"event": "rejected", "at": t, "by": by}},
        },
        return_document=AFTER,
    )
    if claimed is not None:
        return claimed, True
    existing = subs.find_one({"_id": sub_id})
    if existing is None:
        raise NotFound()
    if existing["status"] == REJECTED:
        return existing, False
    raise Conflict(existing["status"])


# --------------------------------------------------------------------------- views
def _iso(value):
    return value.isoformat() if isinstance(value, datetime) else value


def _data_view(data: dict) -> dict:
    lng, lat = data["location"]["coordinates"]
    out = {k: v for k, v in data.items() if k != "location"}
    out.update(lat=lat, lng=lng)
    return out


def _by_view(by: dict | None) -> dict | None:
    return None if by is None else dict(by)


def admin_view(sub: dict) -> dict:
    """Everything an admin needs, including who submitted and who decided."""
    decision = sub.get("decision")
    return {
        "id": str(sub["_id"]),
        "status": sub["status"],
        "data": _data_view(sub["data"]),
        "submitter": dict(sub["submitter"]),
        "submitted_at": _iso(sub["submitted_at"]),
        "updated_at": _iso(sub.get("updated_at")),
        "decision": None
        if not decision
        else {"by": _by_view(decision.get("by")), "at": _iso(decision.get("at")), "reason": decision.get("reason")},
        "restaurant_id": str(sub["restaurant_id"]) if sub.get("restaurant_id") else None,
        "history": [{"event": h["event"], "at": _iso(h["at"]), "by": _by_view(h.get("by"))} for h in sub.get("history", [])],
    }


def user_view(sub: dict) -> dict:
    """What the submitter sees: status and rejection reason, but NOT which admin decided."""
    decision = sub.get("decision") or {}
    return {
        "id": str(sub["_id"]),
        "name": sub["data"]["name"],
        "status": sub["status"],
        "submitted_at": _iso(sub["submitted_at"]),
        "decided_at": _iso(decision.get("at")),
        "reason": decision.get("reason") if sub["status"] == REJECTED else None,
        "restaurant_id": str(sub["restaurant_id"]) if sub["status"] == APPROVED and sub.get("restaurant_id") else None,
        "data": _data_view(sub["data"]),
    }
