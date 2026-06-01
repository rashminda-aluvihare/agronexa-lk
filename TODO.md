# TODO (AgroNexa LK) — Implementation Tracker

## OTP + Admin Approval Flow
- [x] Add backend endpoint `POST /api/auth/register-with-otp` to create user only after OTP is verified.
- [x] Update existing OTP verification flow to gate account creation.
- [x] Update frontend to call the OTP-gated backend flow instead of calling `/api/register` directly.
- [x] Ensure login blocks `status=pending` and `status=rejected`.
- [x] Disable/break bypass endpoint `POST /api/register` so OTP is mandatory.
- [ ] Test end-to-end:
  - [ ] invalid OTP => no user created
  - [ ] valid OTP => user created with `status=pending`
  - [ ] admin approve => login works
  - [ ] admin reject => login stays blocked and reason returns

## SRS-Critical: Auth + RBAC Enforcement
- [ ] Implement JWT middleware for protected endpoints (FR2).
- [ ] Enforce RBAC server-side on role-specific endpoints (FR3).

## SRS-Critical: Real-time In-app Notifications
- [x] Wire Socket.io (or equivalent) so events are emitted for new requests/responses/bookings (FR6/FR12).
- [x] Ensure notification bell unread count stays consistent.

## SRS-Critical: Ledger Integrity
- [ ] Enforce read-only behavior for `rental_ledger` at DB level (no updates/deletes) to match FR7.
- [ ] Add/verify ledger verification endpoint and ensure it recomputes hashes correctly for full chain.

## Manual Smoke Testing
- [ ] Seller can create crop/equipment listings; buyer can browse/search/filter.
- [ ] Buyer broadcasts a request; seller receives in-app notification.
- [ ] Seller responds (accept/reject/counter); buyer receives in-app notification.
- [ ] Equipment booking flow: request -> owner confirm -> renter notified -> ledger entry appended.

## Final Deliverables
- [ ] Update any UI or API contracts that mismatch the SRS.
- [ ] Run full manual scenario walkthrough and document results (optional).

