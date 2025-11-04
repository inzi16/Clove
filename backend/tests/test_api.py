from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest


@pytest.mark.asyncio
async def test_health_and_dashboard_contract(client):
    health = await client.get("/health")
    api_health = await client.get("/api/health")
    assert health.status_code == api_health.status_code == 200
    assert health.json()["status"] == "ok"
    assert health.json()["vector_search"] == "local-cosine"

    response = await client.get("/api/dashboard")
    assert response.status_code == 200
    body = response.json()
    assert body["metrics"] == {
        "active_jobs": 3,
        "total_candidates": 8,
        "interviews_this_week": 3,
        "average_match_score": body["metrics"]["average_match_score"],
    }
    assert [entry["stage"] for entry in body["pipeline"]] == [
        "sourced",
        "screening",
        "interview",
        "offer",
        "hired",
        "rejected",
    ]
    assert len(body["recent_candidates"]) == 5
    assert body["upcoming_interviews"]


@pytest.mark.asyncio
async def test_jobs_and_candidate_dtos_are_frontend_ready(client):
    jobs_response = await client.get("/api/jobs")
    assert jobs_response.status_code == 200
    jobs = jobs_response.json()
    assert jobs["total"] == 4
    backend_job = next(item for item in jobs["items"] if item["id"] == "job_backend")
    assert backend_job["candidate_count"] == 3
    assert backend_job["new_candidates"] == 3
    assert backend_job["hiring_manager"] == "Neha Rao"
    assert backend_job["pipeline_health"] in {"strong", "attention", "new"}

    detail_response = await client.get("/api/jobs/job_backend")
    detail = detail_response.json()
    assert detail_response.status_code == 200
    assert len(detail["pipeline"]) == 6
    assert sum(stage["count"] for stage in detail["pipeline"]) == 3

    candidates_response = await client.get(
        "/api/jobs/job_backend/candidates", params={"query": "FastAPI", "min_score": 60}
    )
    candidates = candidates_response.json()
    assert candidates_response.status_code == 200
    assert candidates["total"] >= 1
    candidate = candidates["items"][0]
    assert {
        "match_score",
        "score_breakdown",
        "score_version",
        "score_evidence",
        "job_title",
        "application_id",
    }.issubset(candidate)
    assert set(candidate["score_breakdown"]) == {
        "semantic",
        "skills",
        "experience",
        "location",
        "weights",
    }


@pytest.mark.asyncio
async def test_identity_membership_enforces_tenant_isolation(client):
    northstar = await client.get("/api/candidates")
    contoso = await client.get(
        "/api/candidates", headers={"X-User-Id": "user_other_tenant"}
    )
    assert northstar.status_code == contoso.status_code == 200
    assert northstar.json()["total"] == 8
    assert contoso.json()["total"] == 1
    assert contoso.json()["items"][0]["id"] == "cand_contoso_private"
    assert all(item["id"] != "cand_contoso_private" for item in northstar.json()["items"])

    hidden_job = await client.get("/api/jobs/job_contoso_secret")
    visible_job = await client.get(
        "/api/jobs/job_contoso_secret", headers={"X-User-Id": "user_other_tenant"}
    )
    assert hidden_job.status_code == 404
    assert visible_job.status_code == 200

    unknown = await client.get("/api/jobs", headers={"X-User-Id": "not-a-user"})
    assert unknown.status_code == 401


@pytest.mark.asyncio
async def test_development_identity_header_fails_closed_in_production(app, client):
    app.state.settings.environment = "production"
    health = await client.get("/api/health")
    response = await client.get("/api/jobs", headers={"X-User-Id": "demo-user"})
    assert health.status_code == 200
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "authentication_not_configured"


@pytest.mark.asyncio
async def test_pipeline_stage_update_validates_job_pipeline(client):
    response = await client.patch(
        "/api/candidates/cand_maya/stage", json={"stage": "hired", "job_id": "job_backend"}
    )
    assert response.status_code == 200
    assert response.json()["stage"] == "hired"

    invalid = await client.patch(
        "/api/candidates/cand_maya/stage", json={"stage": "background_check"}
    )
    assert invalid.status_code == 422
    assert invalid.json()["detail"]["code"] == "invalid_pipeline_stage"


@pytest.mark.asyncio
async def test_semantic_search_is_deterministic_explainable_and_gated(client):
    payload = {"query": "Python FastAPI PostgreSQL backend engineer", "limit": 5}
    first = await client.post("/api/search/semantic", json=payload)
    second = await client.post("/api/search/semantic", json=payload)
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    body = first.json()
    assert body["total"] == 5
    assert body["results"][0]["id"] == "cand_priya"
    assert body["results"][0]["score_version"].endswith("+search-v1")
    assert "search_formula" in body["results"][0]["score_evidence"]
    assert body["results"][0]["match_reasons"][0].startswith("Vector similarity")

    gated = await client.post(
        "/api/search/semantic",
        json=payload,
        headers={"X-User-Id": "user_other_tenant"},
    )
    assert gated.status_code == 402
    assert gated.json()["detail"]["code"] == "feature_not_available"


@pytest.mark.asyncio
async def test_scheduling_creates_link_and_reports_conflicts(client):
    starts_at = datetime.now(timezone.utc) + timedelta(days=14)
    payload = {
        "candidate_id": "cand_priya",
        "job_id": "job_backend",
        "type": "Architecture interview",
        "starts_at": starts_at.isoformat(),
        "ends_at": (starts_at + timedelta(hours=1)).isoformat(),
        "timezone": "Asia/Kolkata",
        "provider": "google",
        "interviewer_names": ["Neha Rao"],
    }
    created = await client.post("/api/interviews", json=payload)
    assert created.status_code == 201
    assert created.json()["type"] == "Architecture interview"
    assert created.json()["meeting_url"].startswith("https://meet.google.com/")
    assert "Neha Rao" in created.json()["interviewer_names"]

    conflict = await client.post("/api/interviews", json=payload)
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == "scheduling_conflict"
    assert conflict.json()["detail"]["conflicts"]


@pytest.mark.asyncio
async def test_interview_mixed_naive_and_aware_timestamps_are_normalized(client):
    starts_at = datetime.now(timezone.utc) + timedelta(days=20)
    ends_at_naive = (starts_at + timedelta(hours=1)).replace(tzinfo=None)
    response = await client.post(
        "/api/interviews",
        json={
            "candidate_id": "cand_arjun",
            "job_id": "job_backend",
            "type": "Normalized timestamp interview",
            "starts_at": starts_at.isoformat().replace("+00:00", "Z"),
            "ends_at": ends_at_naive.isoformat(),
            "provider": "outlook",
            "interviewer_names": ["Omar Williams"],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["starts_at"].endswith("Z")
    assert body["ends_at"].endswith("Z")
    assert len(body["id"]) <= 64


@pytest.mark.asyncio
async def test_integrations_and_billing_contract(client):
    integrations = await client.get("/api/integrations")
    assert integrations.status_code == 200
    assert integrations.json()["total"] == 5
    google = next(
        item for item in integrations.json()["items"] if item["provider"] == "google"
    )
    assert google["connected"] is True
    assert google["name"] == "Google Calendar"
    assert google["account"] == "alex@northstar.example"

    billing = await client.get("/api/billing")
    assert billing.status_code == 200
    body = billing.json()
    assert body["plan"] == "Growth"
    assert body["seats_total"] == 15
    assert body["can_manage"] is True
    assert {item["label"] for item in body["usage"]} == {
        "Team seats",
        "Active jobs",
        "Candidates",
    }
