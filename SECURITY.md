# Security policy

## Supported versions

Clove is currently a pre-release project. Security fixes are made on the latest revision of the `main` branch; there are no supported release branches yet.

## Reporting a vulnerability

Please use GitHub's **Security** tab and choose **Report a vulnerability** so the report stays private. Do not open a public issue for authentication bypasses, cross-tenant access, exposed candidate data, secret leakage, or provider-webhook problems.

Include the affected route or component, a minimal reproduction, the likely impact, and any suggested mitigation. Remove real candidate information, tokens, and credentials from screenshots or logs.

This repository uses local-only credentials and a development identity in its demo configuration. Those defaults are not suitable for a shared or public deployment.
