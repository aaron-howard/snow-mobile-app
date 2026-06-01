# Security policy

Thank you for helping keep **SN Cert Prep** and its users safe.

## Supported versions

Security fixes are applied on the **default branch** (`main` or equivalent). There is no separate long-term support (LTS) line today. If you need a backport to a release tag, say so in your report.

## How to report a vulnerability

**Do not** open a public GitHub issue for an undisclosed security vulnerability.

Use **one** of these channels:

1. **GitHub private reporting** (preferred when available)  
   On this repository: **Security** tab → **Report a vulnerability**.  
   GitHub will route the report privately to maintainers.

2. **Email**  
   If your organization provides a dedicated security inbox, publish that address here and in repository settings. Until then, prefer **GitHub private reporting** (above) so reports are not lost.

Include, where possible:

- A short description of the issue and its impact
- Steps to reproduce (or a proof-of-concept)
- Affected components (mobile app, Cloudflare Worker, sync, auth, etc.)
- Whether you believe the issue is already exploitable in production

## Scope (in scope vs out of scope)

**In scope** for coordinated disclosure:

- Authentication and session handling (e.g. Clerk integration, token storage)
- Authorization bugs (cross-user data access, sync scope bypass)
- Injection or deserialization issues in the Worker or client API layer
- Secrets or credentials accidentally committed or logged
- Remote code execution or unsafe deserialization in app or Worker code paths you can reach as a user

**Out of scope** (use a normal issue instead):

- General bugs, crashes, or UX problems without a security impact
- Denial-of-service that requires overwhelming resources with no privilege boundary
- Social engineering of end users
- Third-party service issues (report to Clerk, Cloudflare, Neon, etc. per their programs) unless this repo clearly misuses their APIs

## What to expect

Maintainers will acknowledge receipt when possible. Add your organization’s expected **initial response time** here once policy is set (see internal security review checklist).

## Safe harbor

If you make a good-faith effort to follow this policy, we will not pursue legal action for accidental, non-destructive research. Do not access data that does not belong to you, do not degrade production services, and do not exfiltrate user data.

## Disclaimer

This application is **unofficial** and not affiliated with ServiceNow, Inc. Vulnerabilities in ServiceNow products should be reported through ServiceNow’s own disclosure channels.
