# 🌾 AgroNexa LK — Backend

Agricultural marketplace backend for Sri Lanka. Connects farmers (sellers) with buyers for crop trading and equipment rental.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Set up PostgreSQL
Create a database named `agronexa` (or use your DATABASE_URL).  
Tables are **auto-created** on first run — no manual SQL needed.

### 4. Run
```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

Server starts on **http://localhost:3000**

---

## 📁 Project Structure

```
agronexa/
├── server.js              # Entry point — Express app, auth, admin
├── routes/
│   ├── authRoutes.js      # OTP send/verify, register-with-otp (Twilio)
│   ├── sellerRoutes.js    # Crop & equipment listings, rental ledger
│   └── buyerRoutes.js     # Marketplace browse, broadcasts, bookings
├── public/
│   ├── index.html         # Landing page
│   ├── admin.html         # Admin panel (approve/reject users)
│   ├── buyer.html         # Buyer portal
│   └── seller.html        # Seller portal
├── uploads/
│   ├── nic/               # NIC images (auto-created)
│   └── listings/          # Listing photos (auto-created)
├── .env.example
└── package.json
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register (no OTP) |
| POST | `/api/login` | Login → returns role |
| POST | `/api/auth/send-otp` | Send Twilio OTP |
| POST | `/api/auth/verify-otp` | Verify OTP code |
| POST | `/api/auth/register-with-otp` | Register + verify OTP in one step |

### Admin (pass `admin_email` + `admin_password`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/pending` | Pending users list |
| GET | `/api/admin/users` | All users |
| POST | `/api/admin/approve/:id` | Approve user |
| POST | `/api/admin/reject/:id` | Reject user |

### Seller (`/api/seller/...`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/crops` | Create crop listing |
| GET | `/crops?seller_id=` | My listings |
| PUT | `/crops/:id` | Update listing |
| DELETE | `/crops/:id` | Delete listing |
| POST | `/equipment` | Create equipment listing |
| GET | `/equipment?owner_id=` | My equipment |
| GET | `/bookings?owner_id=` | Incoming bookings |
| POST | `/bookings/:id/confirm` | Confirm booking |
| POST | `/bookings/:id/reject` | Reject booking |
| GET | `/requests?district=` | Open buyer requests |
| POST | `/requests/:id/respond` | Respond to buyer request |
| GET | `/ledger?owner_id=` | Rental ledger (blockchain-style) |
| GET | `/dashboard?seller_id=` | Seller dashboard stats |

### Buyer (`/api/buyer/...`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/marketplace/crops` | Browse crop listings |
| GET | `/marketplace/crops/:id` | Crop listing detail |
| POST | `/marketplace/crops/:id/interest` | Express interest |
| GET | `/marketplace/equipment` | Browse equipment |
| POST | `/equipment/:id/book` | Book equipment |
| POST | `/broadcasts` | Post a buy request |
| GET | `/broadcasts?buyer_id=` | My broadcasts |
| DELETE | `/broadcasts/:id` | Close broadcast |
| GET | `/notifications?user_id=` | Notifications |
| GET | `/dashboard?buyer_id=` | Buyer dashboard stats |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/:id` | Get user profile |

### Health
| Method | Endpoint |
|--------|----------|
| GET | `/api/health` |

---

## 🗄️ Database Tables (auto-migrated)

- `users` — buyers, sellers, with NIC verification
- `crop_listings` — active produce listings
- `equipment_listings` — farm equipment for rent
- `equipment_bookings` — rental bookings with dates
- `buyer_requests` — broadcast buy requests
- `request_responses` — seller responses to buyer requests
- `rental_ledger` — SHA-256 chained immutable ledger records
- `notifications` — in-app notifications

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes* | Full PostgreSQL connection string |
| `DB_HOST/NAME/USER/PASSWORD` | Yes* | Individual DB fields (if no DATABASE_URL) |
| `ADMIN_EMAIL` | Yes | Admin login email |
| `ADMIN_PASSWORD` | Yes | Admin login password |
| `TWILIO_ACCOUNT_SID` | OTP only | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | OTP only | Twilio auth token |
| `TWILIO_VERIFY_SID` | OTP only | Twilio Verify service SID |
| `PORT` | No | Server port (default: 3000) |

*Either `DATABASE_URL` or individual DB fields required.

---

## 🌐 Deploy on Render

1. Create a **Web Service** → connect your GitHub repo
2. Build command: `npm install`
3. Start command: `npm start`
4. Add a **PostgreSQL** database → copy `DATABASE_URL` to env vars
5. Add all other env vars in the Render dashboard
6. Deploy!
