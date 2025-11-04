# Operations, observability, privacy, and production readiness

> **Target runbook:** the current health endpoint reports process/configuration state and does not probe PostgreSQL or Milvus readiness. The dependency checks, workers, restore drills, and production controls below are required before a pilot rather than features of the local demo.

## Environments

Use isolated accounts/projects, databases, object buckets, encryption keys, OAuth applications, Stripe modes, and provider callbacks for local, staging, and production. Never point a developer stack at production identity, calendar, billing, or candidate data.

The local Compose stack is not a production deployment. Production should use managed PostgreSQL with point-in-time recovery, a supported managed/distributed Milvus deployment sized and backed up for the workload, private networking, managed object storage, an ingress/WAF, secret manager/KMS, and independently scalable API/worker workloads across failure domains.

## Service-level objectives

Set initial targets, measure them, then revise with real usage:

| User journey | Initial target |
| --- | --- |
| API availability excluding planned maintenance | 99.9% monthly |
| ordinary authenticated CRUD p95 | < 300 ms server time |
| semantic search p95 | < 1.5 s, with bounded reranker fallback |
| pipeline transition durability | 99.99%; no acknowledged lost transition |
| webhook durable receipt p95 | < 2 s |
| candidate indexing freshness p95 | < 5 min for normal documents |
| tenant-isolation incidents | 0 |
| deletion workflow completion | < 24 h internally, policy/legal deadline always met |

Create error-budget alerts around symptoms rather than paging on every container restart.

## Telemetry

Use OpenTelemetry-compatible traces, structured JSON logs, and Prometheus-style metrics. Propagate `request_id`, trace context, job/outbox ID, and provider correlation ID. An organization UUID may be included only under the logging privacy policy; prefer a keyed pseudonymous value in shared analytics.

Key metrics:

- request rate, error rate, latency by stable route template (never raw candidate ID);
- PostgreSQL pool saturation, slow queries, lock waits, transaction retries;
- Milvus query/upsert latency, error rate, collection/index load state, stale hydration hits;
- ingestion queue depth/age, parse/embed/upsert failures, retries and dead letters;
- search candidate counts, reranker fallback, index version, cost and quality metrics;
- OAuth callback failures by safe reason code, token refresh/revocation rates;
- calendar provider latency/rate limits, sync lag, partial failures;
- webhook inbox age, duplicate count, handler failure, outbox age;
- entitlement denials, seat/capacity utilization, Stripe projection staleness.

Redact by default. Never log access/refresh tokens, authorization codes, cookies, secrets, raw resumes, candidate contact details, calendar bodies, signed URLs, webhook bodies containing personal data, or model prompts/responses containing candidate text.

## Health and readiness

- **Liveness** answers whether the process event loop is alive; it should not depend on every provider.
- **Readiness** checks required local dependencies with tight timeouts and reports not-ready during migrations.
- **Dependency status** exposes a protected diagnostic summary for PostgreSQL, Milvus, job age, and provider degradation.

An unavailable calendar or model provider should degrade its feature without taking down pipeline CRUD. The MVP falls back from Milvus to local cosine search; production should either expose that degraded mode clearly or return a search-unavailable response while PostgreSQL candidate workflows remain usable.

## Backup and disaster recovery

Define recovery objectives before a pilot; a reasonable starting proposal is PostgreSQL RPO <= 5 minutes/RTO <= 60 minutes and vector-index RPO of source-of-truth data/RTO <= 4 hours through rebuild or backup.

- PostgreSQL: encrypted automated backups, PITR/WAL, quarterly restore drills.
- Object storage: versioning where appropriate, lifecycle/retention rules, inventory and delete verification.
- Milvus: compatible backup tooling plus a tested full rebuild from canonical documents/checksums.
- etcd/MinIO in local Compose: disposable developer state; never mistake local volumes for a backup strategy.
- Configuration: version infrastructure and schema migrations; back up provider mappings without exposing secrets.

Upgrades are staged and pinned. Back up before changing PostgreSQL/Milvus/etcd/MinIO, test restore and collection compatibility, and do not combine a major vector-database upgrade with an embedding-model migration.

## Privacy and responsible hiring

Before production, document controller/processor roles, lawful basis, candidate notices/consent where required, subprocessors, transfer mechanisms, data residency, retention, access/export/correction/deletion handling, and incident response with qualified privacy/employment counsel for operating regions.

Core controls:

- data minimization: collect only job-relevant candidate information;
- purpose limitation: prohibit unrelated surveillance or model training by default;
- retention by organization/jurisdiction with legal hold separated from ordinary retention;
- candidate data export/correction/delete workflows and proof of completion per store;
- encryption in transit and at rest, KMS-backed token encryption, regular key rotation;
- least privilege, MFA for privileged users, short sessions, reviewed service accounts;
- private object storage, malware scanning, file type/size limits, parser sandboxing;
- human review for decisions, visible explanations/unknowns, override and appeal workflow;
- no protected attributes or unjustified proxies in retrieval/scoring;
- versioned validation, bias/adverse-impact assessment appropriate to the jurisdiction and use;
- vendor DPAs and explicit controls on provider data retention/training.

Do not market the platform as “bias-free,” legally compliant by default, or capable of making hiring decisions. Compliance depends on configuration, customers’ use, jurisdiction, validation, and ongoing governance.

## Security baseline

- TLS everywhere; HSTS and secure cookie settings at the edge.
- CSP, frame restrictions, safe CORS allowlist, CSRF defense, output encoding.
- Rate limits for login, search, uploads, exports, invitations, and webhooks.
- OIDC state/nonce/PKCE, exact callback allowlist, token issuer/audience validation.
- Separate runtime/migration roles; PostgreSQL RLS and composite tenant keys.
- Dependency/container scanning, SBOM, pinned releases, patch SLA.
- Secret scanning in CI; managed secret injection, never image-baked secrets.
- SAST plus authorization/tenant integration tests; periodic penetration test.
- Immutable audit sink and alerts on owner/role/domain/provider/billing changes.
- Signed uploads, malware scan/quarantine, parser isolation and time/resource limits.

## AI decision-support production gate

Treat this as a release blocker, not a future policy document. Before any score/rank materially assists an employment decision, the deployment must provide:

- immutable input/evidence snapshots or content hashes with retention-aware access controls;
- score/rubric, feature-extractor, embedding, reranker, and explanation-model versions;
- evidence-linked components, confidence/coverage, unknown/abstain states, and prohibited-feature checks;
- meaningful human review plus an override/disagreement reason and no score-only auto-rejection;
- audit export that reconstructs inputs, versions, outputs, reviewer actions, and disposition without exposing unrelated candidate data;
- documented validation, selection-rate/bias evaluation appropriate to use and jurisdiction, slice quality, and change thresholds;
- candidate notice and a configurable alternative/opt-out workflow where policy or law requires it;
- protected-attribute exclusion from ranking/scoring, with separately governed evaluation data when lawful;
- end-to-end retention, correction, export, and deletion reconciliation across PostgreSQL, object storage, caches, logs, and Milvus.

Legal classification depends on the exact functionality and use. For example, New York City regulates covered automated employment decision tools with bias-audit and notice obligations, and the EU AI Act identifies certain recruitment/selection uses in its high-risk framework. Confirm scope, dates, roles, exceptions, and operating procedures with qualified counsel using the current [NYC DCWP guidance](https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page) and [EU AI Act text](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32024R1689). This is a design checklist, not legal advice.

## Deployment gates

Before staging: migrations are reversible or have a recovery procedure, sample data contains no real candidates, tenant tests pass, provider apps use staging callbacks, and logs have been inspected for PII/secrets.

Before a pilot: restore and deletion drills pass, SLO dashboards/alerts exist, on-call/runbooks exist, search/scoring evaluation meets approved thresholds, the AI decision-support gate above is approved, webhook replay is safe, access review is complete, and privacy/security/legal reviews have signed off for the intended region and workflow.

Before broader availability: load/soak tests support forecast traffic, failure injection covers provider/Milvus/database degradation, model changes have a shadow/canary path, incident response has been exercised, and customer-facing data/AI documentation is accurate.
