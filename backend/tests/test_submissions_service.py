"""Workflow rules: run with `pytest` (or `python -m tests.test_submissions_service`)."""
import pytest

from app import submissions as svc
from tests.fakes import FakeCollection

ADMIN = {"id": "a1", "username": "alice", "role": "Administrator"}
USER = {"uid": "u1", "email": "u1@example.com", "name": "U One"}
DATA = {
    "name": "Cafe Test", "description": "", "cuisine": "Cafe", "category": "Cafes",
    "location": {"type": "Point", "coordinates": [78.4, 17.4]}, "address": "", "phone": "",
    "hours": "", "price_range": None, "image": None,
}
LIM = dict(max_pending=3, max_per_day=10)


def fresh():
    return FakeCollection(), FakeCollection()


def submit(subs, data=None, user=USER, **lim):
    return svc.create(subs, dict(data or DATA), user, **(lim or LIM))


def test_new_submission_is_pending_and_not_public():
    subs, rests = fresh()
    sub = submit(subs)
    assert sub["status"] == "pending"
    assert sub["submitter"]["uid"] == "u1" and sub["submitter"]["email"] == "u1@example.com"
    assert sub["submitted_at"] is not None
    assert rests.docs == []  # nothing public until approval


def test_approve_publishes_and_records_who_decided():
    subs, rests = fresh()
    sub = submit(subs)
    decided, changed = svc.approve(subs, rests, sub["_id"], ADMIN)
    assert changed and decided["status"] == "approved"
    assert decided["decision"]["by"]["username"] == "alice"
    assert len(rests.docs) == 1
    pub = rests.docs[0]
    assert pub["_id"] == sub["_id"] and pub["name"] == "Cafe Test"
    assert pub["rating"] == 0 and pub["review_count"] == 0
    # privacy: the public record carries no submitter identity
    assert "submitter" not in pub and "added_by" not in pub and "u1@example.com" not in str(pub)


def test_approve_twice_is_idempotent_and_publishes_once():
    subs, rests = fresh()
    sub = submit(subs)
    svc.approve(subs, rests, sub["_id"], ADMIN)
    _, changed = svc.approve(subs, rests, sub["_id"], {**ADMIN, "id": "a2", "username": "bob"})
    assert changed is False
    assert len(rests.docs) == 1
    assert subs.find_one({"_id": sub["_id"]})["decision"]["by"]["username"] == "alice"  # first decision stands


def test_reject_keeps_it_unpublished_and_records_reason():
    subs, rests = fresh()
    sub = submit(subs)
    decided, changed = svc.reject(subs, sub["_id"], ADMIN, "Duplicate listing")
    assert changed and decided["status"] == "rejected"
    assert decided["decision"]["reason"] == "Duplicate listing"
    assert rests.docs == []


def test_cannot_approve_after_reject_or_reject_after_approve():
    subs, rests = fresh()
    a = submit(subs)
    svc.reject(subs, a["_id"], ADMIN, "no")
    with pytest.raises(svc.Conflict) as e:
        svc.approve(subs, rests, a["_id"], ADMIN)
    assert e.value.status == "rejected" and rests.docs == []

    b = submit(subs, {**DATA, "name": "Other Place"})
    svc.approve(subs, rests, b["_id"], ADMIN)
    with pytest.raises(svc.Conflict):
        svc.reject(subs, b["_id"], ADMIN, "changed my mind")
    assert len(rests.docs) == 1


def test_unknown_submission_is_not_found():
    subs, rests = fresh()
    with pytest.raises(svc.NotFound):
        svc.approve(subs, rests, 999, ADMIN)
    with pytest.raises(svc.NotFound):
        svc.reject(subs, 999, ADMIN, "x")


def test_approve_repairs_a_publish_that_failed_after_the_decision():
    subs, rests = fresh()
    sub = submit(subs)

    class Boom(FakeCollection):
        def update_one(self, *a, **k):
            raise RuntimeError("database hiccup")

    with pytest.raises(RuntimeError):
        svc.approve(subs, Boom(), sub["_id"], ADMIN)
    assert subs.find_one({"_id": sub["_id"]})["status"] == "approved" and rests.docs == []
    _, changed = svc.approve(subs, rests, sub["_id"], ADMIN)  # retry
    assert changed is False and len(rests.docs) == 1


def test_withdraw_only_own_pending():
    subs, rests = fresh()
    sub = submit(subs)
    with pytest.raises(svc.NotFound):  # someone else's id looks the same as a missing id
        svc.withdraw(subs, sub["_id"], "someone-else")
    assert svc.withdraw(subs, sub["_id"], "u1")["status"] == "withdrawn"
    with pytest.raises(svc.Conflict):
        svc.withdraw(subs, sub["_id"], "u1")
    with pytest.raises(svc.Conflict):  # a withdrawn one can't be approved
        svc.approve(subs, rests, sub["_id"], ADMIN)


def test_limits_and_duplicates():
    subs, _ = fresh()
    submit(subs, {**DATA, "name": "A"})
    with pytest.raises(svc.Duplicate):
        submit(subs, {**DATA, "name": "  a  "})  # same name, different spacing/case
    submit(subs, {**DATA, "name": "B"})
    submit(subs, {**DATA, "name": "C"})
    with pytest.raises(svc.LimitExceeded):  # max_pending=3
        submit(subs, {**DATA, "name": "D"})
    # another user is unaffected
    submit(subs, {**DATA, "name": "A"}, user={**USER, "uid": "u2", "email": "u2@example.com"})


def test_daily_limit():
    subs, _ = fresh()
    for i in range(2):
        svc.create(subs, {**DATA, "name": f"P{i}"}, USER, max_pending=99, max_per_day=2)
    with pytest.raises(svc.LimitExceeded):
        svc.create(subs, {**DATA, "name": "P3"}, USER, max_pending=99, max_per_day=2)


def test_views_hide_what_the_submitter_must_not_see():
    subs, rests = fresh()
    sub = submit(subs)
    decided, _ = svc.reject(subs, sub["_id"], ADMIN, "Not a restaurant")
    mine = svc.user_view(decided)
    assert mine["status"] == "rejected" and mine["reason"] == "Not a restaurant"
    assert "alice" not in str(mine) and "a1" not in str(mine["decided_at"])
    admin = svc.admin_view(decided)
    assert admin["submitter"]["email"] == "u1@example.com"
    assert admin["decision"]["by"]["username"] == "alice"
    assert admin["data"]["lat"] == 17.4 and admin["data"]["lng"] == 78.4


if __name__ == "__main__":  # lets the tests run without pytest installed
    import inspect, sys
    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and inspect.isfunction(fn):
            try:
                fn(); print("PASS", name)
            except Exception as exc:  # noqa
                failed += 1; print("FAIL", name, "->", repr(exc))
    sys.exit(1 if failed else 0)
