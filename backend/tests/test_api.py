"""End-to-end tests of the review workflow through the real HTTP routes.

Run from backend/:   pip install -r requirements.txt -r requirements-dev.txt && pytest
(Written without being able to execute FastAPI in the authoring environment: if one fails,
read the assertion message first - it names the rule that broke.)
"""
from tests.conftest import BODY, USER, admin_headers

ADMIN = "/api/internal/admin/submissions"


def submit(client, **over):
    r = client.post("/api/submissions", json={**BODY, **over})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def public_ids(client):
    return [r["id"] for r in client.get("/api/restaurants").json()["items"]]


def test_submission_is_pending_and_invisible_to_the_public(client):
    sid = submit(client)
    assert public_ids(client) == []
    assert client.get(f"/api/restaurants/{sid}").status_code == 404
    assert client.get("/api/stats").json()["total_restaurants"] == 0
    assert client.get("/api/restaurants/categories").json() == []
    mine = client.get("/api/submissions/mine").json()["items"]
    assert [m["status"] for m in mine] == ["pending"]


def test_client_cannot_set_rating_status_or_owner(client):
    sid = submit(client, rating=5, status="approved", added_by="someone", submitter={"uid": "x"})
    sub = client.get(f"{ADMIN}/{sid}", headers=admin_headers()).json()
    assert sub["status"] == "pending"
    assert sub["submitter"]["uid"] == USER["uid"] and sub["submitter"]["email"] == USER["email"]
    assert "rating" not in sub["data"]


def test_old_write_endpoints_are_gone(client):
    assert client.post("/api/restaurants", json=BODY).status_code == 405
    assert client.put("/api/restaurants/abc", json=BODY).status_code in (404, 405)
    assert client.delete("/api/restaurants/abc").status_code in (404, 405)


def test_admin_api_rejects_everyone_without_a_valid_admin_token(client):
    assert client.get(ADMIN).status_code == 401  # no token
    assert client.get(ADMIN, headers={"Authorization": "Bearer nonsense"}).status_code == 401
    assert client.get(ADMIN, headers=admin_headers(role="Viewer")).status_code == 401
    assert client.get(ADMIN, headers=admin_headers(aud="other")).status_code == 401
    assert client.get(ADMIN, headers=admin_headers()).status_code == 200


def test_approve_publishes_and_hides_submitter_identity(client):
    sid = submit(client)
    r = client.post(f"{ADMIN}/{sid}/approve", headers=admin_headers())
    assert r.status_code == 200 and r.json()["changed"] is True
    assert r.json()["submission"]["decision"]["by"]["username"] == "alice"
    assert public_ids(client) == [sid]
    public = client.get(f"/api/restaurants/{sid}").json()
    assert public["name"] == "Spice Garden" and public["rating"] == 0
    flat = str(public)
    assert USER["email"] not in flat and USER["uid"] not in flat and "added_by" not in public
    mine = client.get("/api/submissions/mine").json()["items"][0]
    assert mine["status"] == "approved" and "alice" not in str(mine)


def test_reject_keeps_it_unpublished_and_tells_the_user_why(client):
    sid = submit(client)
    r = client.post(f"{ADMIN}/{sid}/reject", headers=admin_headers(), json={"reason": "Duplicate listing"})
    assert r.status_code == 200
    assert public_ids(client) == []
    mine = client.get("/api/submissions/mine").json()["items"][0]
    assert mine["status"] == "rejected" and mine["reason"] == "Duplicate listing" and "alice" not in str(mine)


def test_decisions_are_final_and_idempotent(client):
    sid = submit(client)
    client.post(f"{ADMIN}/{sid}/approve", headers=admin_headers())
    again = client.post(f"{ADMIN}/{sid}/approve", headers=admin_headers(username="bob"))
    assert again.status_code == 200 and again.json()["changed"] is False
    assert client.post(f"{ADMIN}/{sid}/reject", headers=admin_headers(), json={"reason": "too late"}).status_code == 409
    assert len(public_ids(client)) == 1


def test_reject_requires_a_reason(client):
    sid = submit(client)
    assert client.post(f"{ADMIN}/{sid}/reject", headers=admin_headers(), json={}).status_code == 422
    assert client.post(f"{ADMIN}/{sid}/reject", headers=admin_headers(), json={"reason": "x"}).status_code == 422


def test_withdraw_and_limits(client):
    sid = submit(client)
    assert client.delete(f"/api/submissions/{sid}").json()["status"] == "withdrawn"
    assert client.post(f"{ADMIN}/{sid}/approve", headers=admin_headers()).status_code == 409
    for i in range(5):
        submit(client, name=f"Place {i}")
    assert client.post("/api/submissions", json={**BODY, "name": "One too many"}).status_code == 429


def test_validation_rejects_bad_input(client):
    assert client.post("/api/submissions", json={**BODY, "image": "javascript:alert(1)"}).status_code == 422
    assert client.post("/api/submissions", json={**BODY, "phone": "call me <script>"}).status_code == 422
    assert client.post("/api/submissions", json={**BODY, "lat": 999}).status_code == 422
