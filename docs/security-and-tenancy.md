# Multi-tenant security and OAuth provisioning

> **Production security design:** the MVP derives tenant context from a seeded membership and scopes its implemented API queries by `organization_id`. PostgreSQL RLS, composite tenant foreign keys, real OIDC/session verification, complete RBAC enforcement, and audit coverage remain production gates.

## Threat model and invariant

The primary catastrophic risk is cross-organization disclosure of resumes, notes, scores, calendars, or billing data. The invariant is simple: no tenant-owned read, write, vector query, export, webhook mutation, or background job runs without an `organization_id` derived from the authenticated session/token plus an authorized membership. A caller-supplied organization header is never tenant authority.

Enforce that invariant in multiple layers:

- route dependencies establish principal, tenant, permission, and entitlement;
- service/repository signatures require tenant context rather than offering optional filters;
- PostgreSQL row-level security is the last line of defense;
- composite tenant foreign keys prevent cross-tenant relationships;
- Milvus queries always include an exact organization scalar expression;
- cache and object-storage keys are tenant namespaced;
- audit and isolation tests cover interactive requests, jobs, exports, and webhooks.

## PostgreSQL row-level security pattern

For each tenant-owned table:

```sql
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates FORCE ROW LEVEL SECURITY;

CREATE POLICY candidates_tenant_isolation ON candidates
USING (organization_id = current_setting('app.organization_id', true)::uuid)
WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);
```

At the start of the transaction, after validating membership:

```sql
SELECT set_config('app.organization_id', :organization_id::text, true);
```

The application database role must not own the tables and must not have `BYPASSRLS`. Migration and break-glass roles are separate and unavailable to the runtime container. Missing tenant context should return no tenant rows, and the service layer should reject it before a query is attempted.

RLS does not replace application authorization. It isolates rows; it does not decide whether a recruiter can administer billing or an interviewer may read private notes.

## Permission and entitlement model

Keep two checks separate:

- **RBAC permission:** may this member perform the action? Examples: `candidate.read`, `pipeline.move`, `interview.schedule`, `billing.manage`.
- **Plan entitlement:** has this organization purchased the capability/capacity? Examples: `semantic_search`, `calendar_sync`, `active_job_limit`, `seat_limit`.

Suggested roles are owner, admin, recruiter, interviewer, and viewer. Persist role assignments; define permission mappings in versioned code/data. Owners can transfer ownership but cannot remove the last active owner. Support custom roles later only after real demand appears.

Return `403` for missing permission, and a stable upgrade-required problem code for a missing entitlement. UI hiding is convenience, never enforcement.

## OIDC sign-in flow

Use OAuth 2.0 Authorization Code with PKCE and OpenID Connect for Google and Microsoft sign-in:

1. Browser requests login; server creates random `state`, `nonce`, and PKCE verifier tied to a short-lived, SameSite cookie/server record.
2. Provider redirects to the registered callback with an authorization code.
3. Server verifies state, exchanges the code, and validates ID token signature via cached JWKS plus issuer, audience, nonce, expiry, and `iat` skew.
4. Resolve identity by immutable `(provider, issuer, subject)`, never by email alone.
5. Associate or provision the user and membership inside a transaction.
6. Rotate the application session and redirect to a fixed allowlisted frontend location.

Never accept access tokens in query strings. Keep application sessions in `HttpOnly`, `Secure`, appropriately `SameSite` cookies where the deployment topology permits; protect state-changing cookie requests with CSRF defenses. If bearer tokens are used, keep access tokens short-lived and rotate refresh tokens with reuse detection.

## Safe organization provisioning

“First login creates an organization from email domain” is fast and dangerous. A safe precedence order is:

1. **Invitation:** a valid, single-use invitation for the exact normalized email joins its organization.
2. **Verified provider tenant mapping:** Microsoft `tid` or a Google Workspace domain joins only when an admin previously linked and verified that tenant/domain.
3. **Self-serve organization:** create a new organization with the user as owner; do not auto-merge other users merely because their email domain matches.

Consumer/free-mail domains never drive organization association. Google `hd` is a routing hint, not proof of authorization by itself. Email changes do not change identity ownership. Domain claim/merge requires a deliberate admin workflow, proof (provider admin consent or DNS), conflict handling, and audit events.

Make provisioning race-safe with unique constraints on provider identity, membership, organization slug, verified provider tenant, and claimed domain. On conflict, reload the winner rather than creating a duplicate.

## Connecting calendars

Sign-in consent and calendar consent are separate connections. Request minimum scopes incrementally, show exactly what is read/written, and bind the callback to the initiating user and organization. Refresh tokens are server-only and envelope encrypted; store ciphertext plus a KMS key reference, never a raw key in the database.

Revocation must disable sync immediately. Periodically test token validity, record granted scopes, and require re-consent when broader scopes are needed.

## Webhook security

For Stripe, Calendly, and provider notifications:

- retain the raw request bytes long enough to verify the provider signature;
- enforce timestamp tolerance and reject invalid signatures before JSON handling;
- store the provider event ID in a unique inbox row before side effects;
- return success after durable receipt, then process asynchronously;
- refetch sensitive current state from the provider when a webhook is only a hint;
- scope the connection/event lookup to organization and external account;
- never trust organization, plan, price, or role fields supplied only in webhook metadata.

## Audit requirements

Audit login success/failure, identity link/unlink, invitations, membership/role changes, organization-domain claims, candidate access/export/delete, score generation/override, pipeline transitions, calendar connection and scheduling, and billing/entitlement changes.

An audit record should contain organization, actor, action, resource identifiers, outcome, request/correlation ID, time, and redacted metadata. Do not include resume bodies, tokens, secrets, calendar descriptions, or model prompts containing personal data.

## Isolation test matrix

For every tenant-owned endpoint and job, create tenant A and tenant B fixtures and assert:

- A can access A with the required permission;
- A cannot read, mutate, enumerate, search, export, schedule, or infer B;
- changing a body/path/header organization ID does not change resolved tenant;
- B’s Milvus vectors never appear in A’s search, including empty or malformed filters;
- background work with missing/mismatched tenant context fails closed;
- caches, signed object URLs, and provider event mappings cannot cross tenants;
- an admin of A has no special authority in B.
