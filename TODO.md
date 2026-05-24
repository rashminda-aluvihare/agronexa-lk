# TODO - Phone OTP -> create account after verification

- [ ] Add backend endpoint `POST /api/auth/register-with-otp` (or equivalent) to create user only after OTP is verified.
- [ ] Update existing OTP verification flow to allow gating account creation.
- [ ] Update frontend (index.html) to call the OTP-gated backend flow instead of calling `/api/register` directly.
- [ ] Ensure login still blocks `status=pending` (already implemented in `server.js`).
- [ ] Test end-to-end:
  - invalid OTP => no user created
  - valid OTP => user created with `status=pending`
  - admin approve => login works

