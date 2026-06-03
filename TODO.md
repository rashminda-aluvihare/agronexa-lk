# TODO (AgroNexa LK Backend Rebuild) — Implementation Tracker

## Backend Architecture (Phase 1)
- [ ] Create new `backend/src/` clean folder structure
- [ ] Create `backend/src/config/` (env, db, express, socket)
- [ ] Create `backend/src/database/` (pg pool wiring)
- [ ] Add Swagger/OpenAPI scaffold under `backend/src/docs/`

## Database (Phase 2)
- [ ] Implement full PostgreSQL schema in migrations (UUID PKs, FKs, indexes)
- [ ] Create migrations for: users, crops (+images), equipment (+images), vehicles (+images), requests/responses, notifications, bookings, ledger, audit_logs, sms_logs, chat_messages, user_settings
- [ ] Implement append-only ledger constraints + triggers

## Auth & RBAC (Phase 3)
- [ ] Implement auth services: registration(with OTP gate), login, logout, refresh tokens, password reset, activation/deactivation
- [ ] Implement login attempt tracking + lock/unlock
- [ ] Implement middleware: authMiddleware + roleMiddleware
- [ ] Implement audit logs for auth + role changes

## Marketplace Modules (Phase 4)
- [ ] Crop listing CRUD + soft delete + image uploads (max 5)
- [ ] Equipment rental module (booking statuses, overlap prevention, accept/reject)
- [ ] Transport rental module (same as equipment)
- [ ] Search module (keyword + filters + sort + pagination)

## Requests, Real-time, Chat (Phase 5)
- [ ] Buyer broadcast requests with negotiation history + 72h expiry
- [ ] Socket.io persistent notification pipeline
- [ ] Chat module with read receipts

## Ledger, Reputation, Admin (Phase 6)
- [ ] Ledger entry creation on booking completion
- [ ] verifyLedger() implementation + endpoint
- [ ] Reputation API derived from ledger metrics
- [ ] Admin APIs: users suspend/activate, remove listings, view ledger/audit logs, CSV export, dashboard statistics

## Security & Deployment (Phase 7)
- [ ] Security hardening: helmet, cors, rate limit, express-validator for all inputs
- [ ] Twilio integration with SMS retry queue (3 attempts) + sms_logs
- [ ] Railway deployment configs + `.env.example`

## Final Verification (Phase 8)
- [ ] Run migrations
- [ ] Smoke test endpoints via Swagger
- [ ] Validate Socket.io event emission
- [ ] Validate ledger verify integrity

