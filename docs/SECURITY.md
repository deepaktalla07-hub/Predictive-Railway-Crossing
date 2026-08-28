# Security & Privacy Architecture

This document details the defense-in-depth security posture, threat mitigation strategies, data privacy controls, and credential management policies implemented across the **Railway Gate Route Assistant**.

---

## 1. Security Threat Modeling & Mitigations

| Threat Vector | Mitigation Strategy Implemented | Verification Mechanism |
| :--- | :--- | :--- |
| **API Key & Secret Leakage** | All third-party credentials (`RAPIDAPI_KEY`, `GOOGLE_MAPS_API_KEY`, database passwords) are stored server-side only in environment variables. Secrets are never sent to frontend bundles or logged. | Verified in `backend/tests/security-review.test.ts` |
| **SQL Injection** | 100% parameterized SQL queries (`$1, $2, ...`) used across all PostgreSQL database repositories. Zero raw string concatenation. | Verified in `backend/tests/database.repository.test.ts` & `security-review.test.ts` |
| **Denial of Service (DoS) / Spam** | Global rate limiter (120 req/min) + strict Community Report rate limiter (5 submissions/min per client IP). Request body size limited to 1MB. | Verified in `backend/tests/security-review.test.ts` |
| **Community Report Abuse** | $\le 800\text{m}$ proximity geofencing, $(0,0)$ coordinate rejection, 30s duplicate debouncing, and multi-factor consensus scoring. | Verified in `backend/tests/community.service.test.ts` |
| **GPS / User Privacy Violation** | Exact user trip trajectories, real IP addresses, and personally identifiable information (PII) are never stored in the database. | Verified in `backend/tests/database.repository.test.ts` |
| **Internal Error Leaks** | Production error handler strips stack traces and database internal exception details, returning a sanitized generic message for 500 errors. | Verified in `backend/tests/security-review.test.ts` |
| **Cross-Origin Attacks & Sniffing** | Helmet security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-Powered-By` disabled) and explicit CORS origin whitelisting. | Verified in `backend/tests/security-review.test.ts` |

---

## 2. Zero-PII GPS Privacy Compliance

To protect user location privacy:
1. **No Real-Time Tracking Storage**: Driving routes requested by users are analyzed in-memory. Road coordinates are not linked to persistent user accounts or stored permanently in query logs.
2. **Coarse Community Geolocation**: Community gate status reports record only the target crossing ID and a validated proximity distance. Exact user home coordinates or ongoing itineraries are discarded immediately after geofence validation.
3. **Database Schema Compliance**: The PostgreSQL database schema contains zero user-identifying columns (`user_id`, `ip_address`, `phone_number`, `device_imei` are deliberately omitted).

---

## 3. Environment & Configuration Security

- `.env` and `.env.local` files are strictly excluded from source control via `.gitignore`.
- Production deployments must supply valid environment variables:
  ```bash
  NODE_ENV=production
  PORT=5001
  CORS_ORIGIN=https://railroute.example.com
  DATABASE_URL=postgresql://user:password@host:5432/railroute_db
  RAPIDAPI_KEY=your_server_side_key
  ```
