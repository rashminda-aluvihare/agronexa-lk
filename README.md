# 🌾 AgroNexa LK — Smart Farming Platform

[![GitHub license](https://img.shields.io/github/license/rashminda-aluvihare/agronexa-lk?style=flat-squared&color=green)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/rashminda-aluvihare/agronexa-lk?style=flat-squared)](https://github.com/rashminda-aluvihare/agronexa-lk/stargazers)
[![Render Deployment](https://img.shields.io/badge/Deployed%20on-Railway%20%26%20Vercel-blue?style=flat-squared)](https://agronexa-lk.vercel.app/)

A premium, state-of-the-art agricultural B2B marketplace and rental platform designed for Sri Lanka. **AgroNexa LK** bridges the gap between local farmers (sellers) and corporate buyers, facilitating direct trade of fresh produce, farm machinery rentals, and automated cryptographic transaction logging.

---

## ✨ Core Features

*   🔒 **OTP-Gate Authentication (Twilio)**: Secure mobile number authentication. Integrates a developer mock bypass (`123456` / `000000`) for rapid testing without burning Twilio credits.
*   👤 **NIC Identity Verification**: Built-in KYC upload pipeline. Sellers and buyers must upload front/back copies of their National Identity Cards (NIC), subject to administrator approval before portal access.
*   🛡️ **Immutable Cryptographic Ledger**: Every confirmed rental agreement is hashed, chained, and appended to a tamper-proof SHA-256 ledger (blockchain-style) to prevent post-confirmation modifications.
*   📡 **SMS Broadcast Network**: Buyers can broadcast crop requests (commodity, volume, target price), which instantly notifies all matching local sellers.
*   💬 **Real-time Live Chat**: Real-time messaging pipeline built on WebSockets (Socket.io) allowing farmers and buyers to negotiate directly.
*   🗺️ **Interactive Geographic Marketplace**: Integrates Leaflet.js map overlays mapping crop stock and equipment availability coordinates across Sri Lanka.
*   🌗 **Rich Premium UI**: Stunning visual dashboard loaded with dark mode settings, analytics charts, status indicator badges, and micro-animations.

---

## 🛠️ Technology Stack

*   **Frontend**: Vanilla HTML5, CSS3 Variables (Custom HSL Themes), JavaScript (ES6+), Socket.io Client, Leaflet.js
*   **Backend**: Node.js, Express.js (REST API, WebSockets)
*   **Database**: PostgreSQL (pg pool, relational design)
*   **Services**: Twilio (SMS OTP verification)
*   **Hosting**: Deployed statically on Vercel (Frontend) and dynamically on Railway/Render (Backend Node server & database)

---

## 📁 Project Layout

```
agronexa-lk/
├── server.js              # Entry node — registers Express app, Socket.io server, & inline endpoints
├── authRoutes.js          # Authentication router (Twilio OTP verify, register-with-otp KYC upload)
├── buyerRoutes.js         # Buyer marketplace, requests broadcasting, & equipment bookings router
├── sellerRoutes.js        # Seller crops inventory, equipment listings, incoming requests router
├── authMiddleware.js      # JWT token parser and role verification middleware
├── public/                # Static assets (if serving directly from Node)
├── uploads/
│   └── nic/               # KYC NIC front/back uploads directory
├── index.html             # AgroNexa Portal Entry (Login, registration, password resets)
├── buyer.html             # Corporate Buyer Portal (Dashboard, Marketplace, Requests, Chat, Ledger)
├── seller.html            # Farmer / Seller Portal (Inventory, Bookings, Reputation, Chat, Ledger)
├── admin.html             # Master Administrator Panel (KYC Review, User Management, Audit logs)
└── package.json           # Application dependencies
```

---

## 🚀 Installation & Local Setup

Follow these steps to run a fully functional local development instance:

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL (v14+) running locally

### 1. Clone & Install
```bash
git clone https://github.com/rashminda-aluvihare/agronexa-lk.git
cd agronexa-lk
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```ini
PORT=3000
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/agronexa

# Admin Setup
ADMIN_EMAIL=admin@agronexa.lk
ADMIN_PASSWORD=ChangeThisToASecurePassword123!

# JWT Encryption
JWT_SECRET=super-secure-jwt-key-change-this-in-prod

# Twilio Credentials (Leave empty to trigger developer mock OTP bypass)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SID=
```

### 3. Initialize Database
Ensure your local PostgreSQL instance is running. The database schema, relational tables, constraints, and audit logs are **auto-migrated and initialized on startup** — no manual SQL executions needed!

### 4. Fire It Up!
```bash
# Run with live reload
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🔌 API Documentation

<details>
<summary>🔑 Authentication Endpoints</summary>

| Method | Route | Auth | Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/send-otp` | None | `{ "phone": "+94771234567" }` | Sends SMS verification code (auto-bypasses to mock if Twilio credentials are blank) |
| `POST` | `/api/auth/verify-otp` | None | `{ "phone": "+94771234567", "code": "123456" }` | Validates verification code |
| `POST` | `/api/auth/register-with-otp` | None | Multipart FormData (KYC fields + `nic_front`, `nic_back`) | Creates new user account in `pending` status |
| `POST` | `/api/login` | None | `{ "email": "user@example.com", "password": "Password123!" }` | Authenticates user and returns JWT token and user profile role |

</details>

<details>
<summary>👑 Administrator Endpoints</summary>

| Method | Route | Auth | Queries | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/pending` | JWT | `?admin_email=..&admin_password=..` | Retrieves users awaiting KYC approval |
| `POST` | `/api/admin/approve/:id` | JWT | Request Body (Credentials) | Activates user account status to `approved` |
| `POST` | `/api/admin/reject/:id` | JWT | `{ "reason": "NIC blurred" }` | Rejects KYC application |
| `GET` | `/api/admin/audit-logs` | JWT | Credentials query | Fetches application audit logs |

</details>

<details>
<summary>🌾 Farmer / Seller Endpoints</summary>

| Method | Route | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/seller/crops` | JWT | Creates a new crop stock listing for the marketplace |
| `GET` | `/api/seller/crops?seller_id=1` | JWT | Retrieves active crop listings owned by the seller |
| `DELETE` | `/api/seller/crops/:id` | JWT | Deactivates crop stock listing |
| `POST` | `/api/seller/equipment` | JWT | Publishes a piece of machinery for rent |
| `GET` | `/api/seller/bookings?owner_id=1` | JWT | Fetches rental booking requests |
| `POST` | `/api/seller/bookings/:id/confirm` | JWT | Accepts booking request and writes to the blockchain ledger |

</details>

<details>
<summary>🏢 Corporate Buyer Endpoints</summary>

| Method | Route | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/buyer/marketplace/crops` | JWT | Browse and filter all available crop listings in Sri Lanka |
| `POST` | `/api/buyer/marketplace/crops/:id/interest` | JWT | Expresses trade interest to the farmer |
| `POST` | `/api/buyer/bookings` | JWT | Submits a request to book a seller's machinery |
| `POST` | `/api/buyer/broadcasts` | JWT | Broadcasts a buy request for specific crops across local districts |

</details>

---

## 🛡️ Tamper-Proof SHA-256 Chained Ledger

AgroNexa LK includes a simplified cryptographic blockchain protocol to secure B2B rental agreements. Every time a seller confirms an incoming booking request, a transaction block is mined:
1.  **Block Payload**: `listing_id`, `listing_type`, `renter_id`, `owner_id`, `amount`, and `duration_days`.
2.  **Chaining**: The block references the hash of the *previous transaction block* (`prev_hash`).
3.  **Cryptographic Hash**: A `block_hash` is calculated by running the payload through a SHA-256 mining algorithm:
    $$\text{block\_hash} = \text{SHA256}(\text{tx\_id} + \text{payload} + \text{prev\_hash})$$
4.  **Verification**: Any user can trigger the **Verify Chain** validation tool. If any block's value (such as rental price or owner ID) is altered in the PostgreSQL database directly, the hash chain breaks instantly, alerting users to a security breach.

---

## 🌍 Deployment

### Frontend (Vercel)
The client frontend is optimized for static deployments. You can deploy the folder straight to Vercel. 
*Note: Make sure your `API_URL` environment mapping points to your deployed backend node.*

### Backend (Railway / Render)
1.  Connect your GitHub repository to Railway.
2.  Attach a PostgreSQL database resource.
3.  Add all standard environment variables listed in the environment section.
4.  Deploy. The service automatically runs migrations and handles connections.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
