# Make it happen: prioritized product and engineering plan

## Product wedge

The platform wins by making the recruiter’s first review faster **without hiding why a candidate surfaced**. Build around one measurable loop:

1. create a job and publish its rubric;
2. import candidates and see index freshness;
3. search with exact filters plus semantic intent;
4. inspect cited evidence, coverage, and unknown requirements;
5. move a candidate through a configurable pipeline with a durable history;
6. schedule from the same application when the candidate is ready.

Avoid turning the first release into a broad ATS replacement. CSV/API import and export can connect the wedge to existing systems while quality and trust are proven.

## Now: reliable vertical slice (weeks 0–4)

**Deliver**

- Organization, user, membership, invite, job, candidate, application, stage, pipeline-event, audit, outbox, and score-policy schemas.
- One safe local sign-in path plus Google/Microsoft OIDC interfaces; tenant resolution and RBAC dependencies.
- RLS/composite tenant constraints and A-versus-B isolation tests from day one.
- Resume/CSV import, quarantine/parse, content/source-identity deduplication, section-aware chunking, local embedding, versioned Milvus upsert, and deletion tombstone.
- Hybrid-friendly search contract: tenant filter, structured filters, dense retrieval, grouping, evidence hydration, deterministic fallback.
- Versioned score policy and immutable score-run inputs, deterministic weighted scoring, evidence/confidence/coverage/unknown output, and human override reason—never an opaque LLM rank.
- `Application` as the job-specific pipeline entity, with Kanban/list views, server-enforced transitions, and optimistic concurrency.
- Explicit job-specific recruiter relevance/rubric feedback, disagreement reasons, and a baseline calibration report; feedback does not silently retrain or reweight production scoring.
- Append-only audit log, transactional outbox/webhook inbox idempotency, and vector-deletion reconciliation status.
- Compose stack, migrations, seed/demo fixture, health endpoints, structured logs, and CI quality checks.

**Acceptance criteria**

- `docker compose up --build` reaches healthy services from a clean checkout using documented prerequisites and no external credentials.
- Automated negative tests cover every tenant-owned API/resource type; tenant A receives zero tenant B rows or Milvus hits, including manipulated identifiers.
- Replaying a document-ingestion job produces no duplicate candidate/chunk and the same content checksum/index version.
- Re-importing the same source candidate/document is idempotent; ambiguous potential duplicates are queued for human merge review rather than destructively auto-merged.
- Deleting a candidate hides it immediately and a test confirms eventual removal from PostgreSQL-visible data, Milvus, and object storage.
- Every search response identifies index version/freshness and includes traceable evidence for displayed reasons.
- Every score component is supported, `unknown`, or explicitly not met; score policy/version and coverage are stored.
- A reviewer can reproduce which immutable input/evidence snapshot and model/policy versions produced a score, and every override records a reason.
- Concurrent pipeline updates yield one valid transition and one conflict, with one audit/history event per accepted transition.
- A labeled seed set establishes keyword and dense baselines plus Recall@50/nDCG@10; thresholds are agreed before claiming quality gains.
- Recruiter feedback is application/job specific; a calibration report includes inter-rater disagreement and no production score weight changes automatically from feedback.
- p95 ordinary API and search latency are measured on a documented reference dataset/hardware, even if initial targets are not yet met.

## Next: integrations, billing, and trust (weeks 5–8)

**Deliver**

- Production OIDC provisioning with invitation precedence, verified Microsoft tenant/Google Workspace mapping, linking/unlinking, and recovery.
- Google and Microsoft busy lookup plus idempotent create/update/cancel; Calendly adapter/link and signed webhook inbox.
- Interview slot confirmation with time-zone correctness, availability recheck, conflict UX, and partial-sync status.
- Stripe Checkout/Portal, signed webhook projection, catalog/entitlement resolver, seat/capacity enforcement, and grace policies.
- Background worker/outbox dashboards, provider backoff/rate-limit handling, dead-letter replay, and protected sync diagnostics.
- Candidate data export/correction/delete workflow, retention policy, admin audit view, model/rubric version display.
- AI decision-support production gate: immutable evidence/version lineage, audit export, human override, protected-feature exclusion, notice/alternative workflow configuration, selection-rate/bias evaluation, and retention/deletion proof.
- Evaluation harness with evidence precision, abstention, slice quality, cost, and latency; shadow deployment for ranking changes.

**Acceptance criteria**

- OAuth account association is based on provider issuer/subject; concurrent first logins cannot duplicate identities, organizations, or memberships.
- Unverified shared email domains never auto-join users to an existing organization.
- A DST-boundary scheduling suite confirms UTC storage/IANA display; slot confirmation catches a newly introduced conflict.
- Provider create retries do not produce duplicate meetings; duplicated/out-of-order webhooks are safe.
- No feature becomes available from a Checkout redirect or forged client plan; only the verified subscription projection changes entitlements.
- Role and plan checks are independently tested (for example, paid interviewer still cannot manage billing; unpaid owner cannot use a gated feature).
- Token/secrets/resume scans of representative logs find no sensitive payloads.
- A restore drill and a candidate-deletion drill meet the initial documented objectives.

## Later: scale and differentiation (weeks 9+)

Prioritize only with evidence from pilots:

- ATS connectors (Greenhouse, Lever, Workday) with clear source-of-truth and conflict policy.
- Team scorecards, structured interview kits, interviewer calibration, and candidate self-scheduling.
- Multilingual parsing/search and job-family-specific evaluation sets.
- Talent rediscovery and saved-search alerts with retention/consent safeguards.
- Custom roles, SAML/SCIM, audit export, data residency, customer-managed retention, enterprise keys.
- Managed/distributed Milvus, dedicated ingestion workers, GPU batching, queue partitioning, read replicas, regional deployment.
- Customer-specific scoring policies and carefully governed learning-to-rank based on explicit relevance labels—not historical hiring outcomes alone.
- Analytics for funnel time, source quality, scheduling load, and rubric coverage using aggregate/minimized data.

**Exit signals for scaling architecture**

- queue age violates the freshness SLO under normal load;
- Milvus or embedding workloads contend with API reliability;
- database lock/pool/query metrics identify a specific bottleneck after indexing/query fixes;
- provider rate limits require independently scaled adapters;
- enterprise residency/isolation requirements justify regional or dedicated deployments.

## Brainstorm: improvements with high leverage

| Idea | Why it is better | Priority / proof |
| --- | --- | --- |
| Rubric-first job setup | makes matching criteria explicit before candidate exposure and improves explanations | Now; rubric completion and override rate |
| Evidence diff when score changes | shows exactly which document/rubric/model change moved a score | Now; fewer support questions, reviewer trust |
| Unknown-information checklist | converts low coverage into recruiter actions instead of false negatives | Now; unknown-resolution rate |
| Search quality workbench | lets internal teams compare keyword/dense/hybrid/reranked results on labeled queries | Next; nDCG/Recall and evaluation speed |
| Availability confidence | displays provider freshness and partial connections instead of a misleading green slot | Next; conflict/rebooking rate |
| Integration replay console | safe inspection/replay for inbox/outbox failures with redaction | Next; mean time to recovery |
| Policy simulator | previews entitlement/role/score-rule changes against synthetic fixtures | Next; regression count |
| Candidate-facing data portal | access/correct/scheduling/status flows can reduce recruiter work and improve privacy handling | Later; support volume and completion time |
| ATS sidecar mode | semantic review layer atop an incumbent ATS lowers migration friction | Later; pilot activation/conversion |

## Metrics that matter

Use baselines and cohorts; do not quote improvements before measurement.

- median time from job creation to first qualified-review set;
- recruiter precision at 10 and relevant-candidate Recall@50;
- evidence-supported explanation rate and unknown/abstention rate;
- percentage of surfaced candidates recruiters advance, with caveats about outcome bias;
- time per pipeline transition and scheduling completion/rebooking rate;
- onboarding time from invite/sign-in to first completed job action;
- search p95/cost, indexing freshness, provider sync success, webhook age;
- weekly active recruiting organizations, retained usage, entitlement upgrade triggers;
- deletion/export completion SLA and tenant/security incident count.

The stated 40% onboarding and 20% latency improvements should be treated as targets or historical measurements only when backed by a named baseline, sample window, instrumentation, and reproducible query/workflow. A defensible resume claim is specific: what was measured, over what traffic/data, and how the comparison was run.

## Decision log to open immediately

Record short architecture decisions for:

1. cookie session versus bearer-token topology;
2. local embedding model and first production embedding provider;
3. resume object storage and malware/parser isolation;
4. PostgreSQL RLS runtime/migration role design;
5. pipeline stage configurability and valid-transition rules;
6. first search evaluation set and release thresholds;
7. score-policy governance and prohibited features;
8. Stripe grace/downgrade policy;
9. calendar source-of-truth and conflict policy;
10. retention/deletion defaults and initial operating jurisdictions.

Every decision should name owner, date, chosen option, alternatives, consequences, and revisit trigger. This prevents “temporary” security and model behavior from becoming undocumented product policy.
