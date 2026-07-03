# 🌾 AgroNexa LK — Smart Farming & B2B Agricultural Platform

[![GitHub license](https://img.shields.io/github/license/rashminda-aluvihare/agronexa-lk?style=flat-squared&color=green)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/rashminda-aluvihare/agronexa-lk?style=flat-squared)](https://github.com/rashminda-aluvihare/agronexa-lk/stargazers)
[![Render Deployment](https://img.shields.io/badge/Deployed%20on-Railway%20%26%20Vercel-blue?style=flat-squared)](https://agronexa-lk.vercel.app/)

AgroNexa LK is a decoupled B2B agricultural marketplace, machinery sharing, and logistics platform designed to solve structural inefficiencies in Sri Lanka's agrarian supply chains. The system aims to eliminate financial exploitation of local farmers by middleman cartels and optimize the utilization of agricultural equipment.

The platform provides role-based interfaces for **Farmers (Sellers)**, **Corporate Buyers**, **Logistics Providers**, and **System Administrators**, backed by a PostgreSQL database and a Node/Express.js backend.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js (REST API, WebSockets via Socket.io)
- **Database**: PostgreSQL (relational design, indexing, transactional queries)
- **Frontend Dashboard**: React, Vite, TypeScript, TailwindCSS, Lucide Icons, Recharts (analytics)
- **Legacy Frontend Pages**: HTML5, Vanilla CSS, JS Client Engines, Leaflet.js (interactive maps)
- **Third-Party Services**: Twilio API (SMS verification & transactional alerts), HARTI website (crop price scraping)

---

## 📁 Project Structure

```
agronexa-lk/
├── backend/                   # Express.js REST API Server
│   ├── src/
│   │   ├── config/            # PostgreSQL Connection & Auto-Migrations
│   │   ├── controllers/       # Route controllers (auth, marketplace, ledger, transport, chat, admin)
│   │   ├── docs/              # Swagger API Specifications
│   │   ├── middlewares/       # JWT auth, rate limits, image upload filters, error handlers
│   │   ├── routes/            # Route groupings (admin, auth, buyer, seller, transport, chat, ledger)
│   │   ├── services/          # Business logic: Crypto Ledger, HARTI Web Scraper, SMS Alerts
│   │   ├── socket/            # Socket.io configuration for real-time messaging
│   │   ├── app.js             # App setup & static page endpoints
│   │   └── server.js          # Server entry point
│   └── package.json           # Backend dependency configuration
├── frontend/                  # React + Vite Client Dashboard
│   ├── src/
│   │   ├── data/              # Mock data and local storage variables
│   │   ├── pages/             # BuyerDashboard and SellerDashboard components
│   │   ├── shared/            # Common UI elements
│   │   ├── styles/            # Tailwind and global stylesheet rules
│   │   └── App.tsx            # React application router & switcher
│   └── package.json           # Frontend configuration and Vite scripts
├── diagrams/                  # System Design & Architecture Diagrams (UML & Flowcharts)
├── uploads/                   # Local media uploads folder (KYC NIC scans, crop photos)
├── index.html                 # Legacy Client Login page
├── seller.html                # Legacy Farmer/Seller dashboard
├── buyer.html                 # Legacy Corporate Buyer dashboard
├── admin.html                 # Legacy Administrator control panel
├── translations.js            # Shared multi-lingual translation dictionary (English, Sinhala, Tamil)
├── server.js                  # Root server startup wrapper for hosting environments
├── package.json               # Root dependencies and startup scripts
└── TODO.md                    # System development checklist
```

---

## ✨ Core Features & Technical Implementation

### 1. Multi-lingual Localization Engine
- **Implementation**: Managed in [translations.js](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/translations.js). It serves as a unified client-side localization dictionary supporting **English**, **Sinhala**, and **Tamil**.
- **State Preservation**: Language configurations are saved directly in local storage, enabling dynamic text replacement without page refreshes.

### 2. Tamper-Evident SHA-256 Transaction Ledger
- **Algorithm**: A blockchain-inspired transaction log implemented in [ledger.service.js](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/backend/src/services/ledger.service.js) for machinery rental agreements.
- **Chaining**: Each confirmed lease writes a block to the database, capturing transactional details (`listing_id`, `amount`, `duration_days`), an agreement text signature hash, and a SHA-256 hash chaining to the previous block:
  $$\text{block\_hash} = \text{SHA256}(\text{tx\_id} + \text{payload} + \text{prev\_hash})$$
- **Verification Engine**: Administrators can trigger a sequential re-computation process that compares calculated hashes against stored records. Any unauthorized database modification breaks the chain and flags the affected records.

### 3. Double-Booking Prevention Algorithm
- **Concurrency Control**: Implemented inside [equipment.controller.js](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/backend/src/controllers/equipment.controller.js).
- **Logic**: Prevents overlapping machinery leases on overlapping dates. Validation SQL checks if any approved reservation conflicts with a requested schedule before saving the lease:
  ```sql
  WHERE (start_date <= :requested_end_date AND end_date >= :requested_start_date)
  ```

### 4. HARTI Agricultural Market Price Scraper
- **Scraper Service**: Configured in [scraper.service.js](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/backend/src/services/scraper.service.js).
- **Execution**: Scrapes daily commodity market prices from the Hector Kobbekaduwa Agrarian Research and Training Institute (HARTI) website using Axios and Cheerio.
- **Simulation Fallback**: If external servers are unresponsive, the system runs a mock fluctuation algorithm to simulate daily price updates based on historical ranges.

### 5. Secure KYC Validation Pipeline
- **Validation Route**: Coordinates image uploads via Multer to `uploads/nic/` for review.
- **Admin Lightbox UI**: Located in [admin.html](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/admin.html). It contains image-manipulation tools (scaling, rotation) built on CSS and Canvas to review NIC cards. Users are registered as `pending` and cannot trade until verified by an admin.

### 6. WebSocket Chat & Internal Alerts
- **Communication Hub**: Built using Socket.io inside [socket.js](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/backend/src/socket).
- **Real-Time Delivery**: Matches active sockets to dispatch messages, update typing states, and update read/unread statuses instantly on user UI panels.

### 7. Logistics & Transport Matching
- **Matching Engine**: Located in [transport.controller.js](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/backend/src/controllers/transport.controller.js).
- **Logistics**: Allows transport providers to list vehicles, districts covered, and rates per kilometer. Sellers can request delivery bookings, match with local drivers, and track cargo transportation parameters.

---

## 🔌 API Endpoints Documentation

Swagger documentation is available at `/api-docs` when running the application.

### 🔑 Authentication (`/api/auth`)
- `POST /api/auth/send-otp` — Dispatches verification code (Mock mode bypass is active if Twilio credentials are blank).
- `POST /api/auth/verify-otp` — Validates SMS OTP codes.
- `POST /api/auth/register-with-otp` — Multi-part registration uploading `nic_front` and `nic_back` files.
- `POST /api/login` — Verifies credentials, returns a JWT token.
- `POST /api/auth/forgot-password` — Generates a secure reset password payload.

### 🌾 Seller/Farmer Portal (`/api/seller`)
- `POST /api/seller/crops` — Creates a new crop inventory listing.
- `GET /api/seller/crops` — Fetches crop listings associated with the logged-in seller.
- `PUT /api/seller/crops/:id/update-stock` — Updates current quantity figures.
- `GET /api/seller/bookings` — Lists equipment bookings awaiting owner confirmation.
- `POST /api/seller/bookings/:id/confirm` — Approves booking and records transaction blocks to the SHA-256 ledger.
- `GET /api/seller/analytics` — Provides sales metrics and revenue breakdown.

### 🏢 Corporate Buyer Portal (`/api/buyer`)
- `GET /api/buyer/marketplace/crops` — Browses public catalog with search and filters.
- `POST /api/buyer/marketplace/crops/:id/interest` — Expresses trade interest to the farmer.
- `POST /api/buyer/broadcasts` — Broadcasts commodity/price requests to sellers in target districts.
- `POST /api/buyer/bookings` — Requests a reservation for seller machinery.
- `GET /api/buyer/dashboard` — Fetches overview metrics, matching broadcasts, and recent listings.

### 🚚 Transport & Logistics (`/api/transport`)
- `GET /api/transport` — Browses active vehicle and driver profiles.
- `POST /api/transport` — Creates or updates a transport provider profile.
- `POST /api/transport/bookings` — Initiates transport bookings for commodity logistics.
- `PUT /api/transport/bookings/:id/status` — Updates status (pending, accepted, completed).

### 👑 Administrator (`/api/admin`)
- `GET /api/admin/pending` — Retrieves user profiles awaiting NIC review.
- `POST /api/admin/approve/:id` — Activates verified user accounts.
- `POST /api/admin/reject/:id` — Rejects application and logs rejection explanations.
- `GET /api/admin/audit-logs` — Fetches system action audit histories.
- `GET /api/admin/export/:resource` — Exports statistics as CSV spreadsheets.

---

## 🚀 Installation & Development Setup

### 1. Database Setup
Ensure PostgreSQL is installed and running locally. Create a database instance:
```sql
CREATE DATABASE agronexa;
```

### 2. Configuration (.env)
Create a `.env` file in the root folder of the project:
```ini
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/agronexa

# Admin Account setup (seeded if database is blank)
ADMIN_EMAIL=admin@agronexa.lk
ADMIN_PASSWORD=AdminSecurePassword123!

# JWT Secret
JWT_SECRET=your_jwt_signing_key_secret

# Twilio SMS API Keys (If left empty, OTP bypass matches code '123456' / '000000')
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SID=
```

### 3. Run Backend Server
Install dependencies and run the server locally:
```bash
# Run from root directory
npm install
npm run dev
```
The server will boot, run SQL tables initialization/migrations, and host the HTTP server on `http://localhost:3000`.

### 4. Run Frontend Dashboard
Navigate to the frontend folder, install dependencies, and spin up Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
The React frontend dashboard will run on `http://localhost:5173`.

---

## 📐 System Design & Architecture Diagrams

Detailed UML diagrams and workflow flowcharts are available in the [diagrams/](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/diagrams) folder:

- **Architecture Overview**: [Overall System Architecture](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/diagrams/Figure_4.1_Overall_System_Architecture.png)
- **Relational Model**: [Entity Relationship Diagram (ERD)](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/diagrams/Figure_4.2_Entity_Relationship_Diagram.png)
- **Functional Scope**: [Use Case Diagram](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/diagrams/Figure_4.3_Use_Case_Diagram.png)
- **Security Check**: [KYC Verification Activity Diagram](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/diagrams/Figure_4.11_KYC_Verification_Activity_Diagram.png)
- **Cryptographic Ledger**: [Chained Ledger Workflow Diagram](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/diagrams/Figure_4.8_Cryptographic_Ledger_Workflow.png)
- **Booking Flow**: [Equipment Booking Sequence Diagram](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/diagrams/Figure_4.5_Equipment_Booking_Sequence_Diagram.png)
- **Component Design**: [Component Diagram](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/diagrams/Figure_4.6_Component_Diagram.png)
- **Development Layout**: [Code Structure Diagram](file:///c:/Users/rashm/OneDrive/Desktop/agronexalk/diagrams/Figure_5.7_Code_Structure.png)

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
