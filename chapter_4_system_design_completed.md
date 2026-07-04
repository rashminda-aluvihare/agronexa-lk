# CHAPTER 4 – SYSTEM DESIGN

## 4.1 Introduction

System design is the process of transforming system requirements into a structured architecture that defines how the software components interact to achieve the project objectives. A well-designed architecture improves system reliability, scalability, maintainability, and security while simplifying future enhancements.

The AgroNexa LK Smart Farming Platform was designed using a modular three-tier architecture consisting of the presentation layer, application layer, and database layer. Each module performs a specific responsibility while communicating securely with the others through RESTful APIs and real-time communication services.

The system design emphasizes secure authentication, role-based authorization, modular implementation, data integrity, scalability, and user-friendly interaction.

---

## 4.2 Overall System Architecture

The AgroNexa LK platform follows a three-tier client-server architecture.

### Presentation Layer
The presentation layer consists of the React.js web application accessed through modern web browsers. This layer provides interfaces for administrators, farmers, and corporate buyers. It includes user registration, login, dashboards, marketplace browsing, equipment rental, live chat, and administrative functions.

### Application Layer
The application layer is implemented using Node.js and Express.js. It processes client requests, validates user input, performs authentication, executes business logic, communicates with external services, and interacts with the PostgreSQL database.

Major modules include:
* Authentication Module
* KYC Management Module
* Marketplace Module
* Equipment Rental Module
* Broadcast Request Module
* Notification Module
* Live Chat Module
* Cryptographic Ledger Module
* Audit Log Module
* Administration Module

### Database Layer
The database layer uses PostgreSQL to securely store user accounts, crop listings, equipment information, booking records, messages, notifications, audit logs, and cryptographic ledger blocks.

**Figure 4.1: Overall System Architecture**

```mermaid
graph TD
    %% Presentation Layer
    subgraph Presentation_Layer["Presentation Layer (Client-Side)"]
        Browser["Web Browser (React.js + Tailwind CSS)"]
        UI_Buyer["Buyer Dashboard View"]
        UI_Seller["Seller Dashboard View"]
        UI_Admin["Admin Panel View"]
        Browser --> UI_Buyer
        Browser --> UI_Seller
        Browser --> UI_Admin
    end

    %% Application Layer
    subgraph Application_Layer["Application Layer (Server-Side)"]
        API_Gateway["Express.js Server (Node.js)"]
        Auth_Mod["Auth Module (JWT & BCrypt)"]
        Market_Mod["Marketplace & Orders Module"]
        Rental_Mod["Equipment Rental Module"]
        Broadcast_Mod["Broadcast Request Module"]
        Ledger_Mod["Cryptographic Ledger Module"]
        Chat_Mod["Live Chat (Socket.IO)"]
        Audit_Mod["Audit Logging Service"]

        API_Gateway --> Auth_Mod
        API_Gateway --> Market_Mod
        API_Gateway --> Rental_Mod
        API_Gateway --> Broadcast_Mod
        API_Gateway --> Ledger_Mod
        API_Gateway --> Chat_Mod
        API_Gateway --> Audit_Mod
    end

    %% Database & External Layer
    subgraph Database_Layer["Database & Storage Layer"]
        DB[("PostgreSQL Database")]
        Cloudinary["Cloudinary Storage (Images/KYC)"]
    end

    %% Connections
    Browser -- "HTTPS (REST APIs)" --> API_Gateway
    Browser -- "WebSocket (Real-time)" --> Chat_Mod
    Application_Layer -- "SQL Queries" --> DB
    API_Gateway -- "Upload Documents/Photos" --> Cloudinary
```

---

## 4.3 System Modules

The AgroNexa LK platform consists of several independent but interconnected software modules.

### Authentication Module
Provides OTP verification, JWT authentication, password hashing, user login, logout, and session management.

### KYC Verification Module
Allows users to upload National Identity Card (NIC) images. Administrators manually verify the documents before activating user accounts.

### Crop Marketplace Module
Allows farmers to publish agricultural products with descriptions, prices, quantities, photographs, and geographical locations.

### Equipment Rental Module
Allows farmers to advertise agricultural machinery while enabling buyers to submit rental requests.

### Broadcast Request Module
Allows buyers to publish large-scale procurement requirements targeted at selected districts.

### Notification Module
Generates real-time notifications for approvals, booking requests, chat messages, and broadcast responses.

### Live Chat Module
Uses Socket.IO to facilitate instant communication between buyers and farmers.

### Cryptographic Ledger Module
Generates SHA-256 hash chains whenever rental bookings are confirmed, ensuring transaction integrity.

### Administration Module
Provides dashboard analytics, KYC approvals, user management, audit monitoring, report generation, and ledger verification.

**Figure 4.9: System Modules Design**

```mermaid
graph TD
    %% User Interfaces
    subgraph UI["User Access & Interfaces"]
        AdminView["Admin Dashboard UI"]
        FarmerView["Farmer Dashboard UI"]
        BuyerView["Buyer Dashboard UI"]
    end

    %% core application gateway
    subgraph Gateway["Application Layer Modules"]
        direction TB
        subgraph Core["Core Business Logic Modules"]
            Marketplace["Crop Marketplace Module"]
            Rental["Equipment Rental/Booking Module"]
            Broadcast["Broadcast Request Module"]
        end

        subgraph Security["Auth & Trust Verification"]
            Auth["Authentication Module <br/>(OTP, JWT, BCrypt)"]
            KYC["KYC Verification Module <br/>(NIC Document Review)"]
        end

        subgraph Services["Shared Real-time & Security Services"]
            Chat["Live Chat Module <br/>(Socket.IO)"]
            Notif["Notification Module <br/>(Real-time + SMS)"]
            Ledger["Cryptographic Ledger <br/>(SHA-256 Block Verification)"]
            Audit["Audit Log Module <br/>(Security Operations Logs)"]
        end
    end

    %% Database & Cloud
    subgraph Data["Database & External Storage"]
        DB[("PostgreSQL <br/>(Relational Tables)")]
        Cloud["Cloudinary CDN <br/>(Image Assets)"]
    end

    %% Interconnections
    AdminView --> KYC
    AdminView --> Audit
    AdminView --> Marketplace
    FarmerView --> Marketplace
    FarmerView --> Rental
    FarmerView --> Chat
    BuyerView --> Marketplace
    BuyerView --> Rental
    BuyerView --> Broadcast
    BuyerView --> Chat

    KYC --> Auth
    Marketplace --> Data
    Rental --> Ledger
    Broadcast --> Notif
    Ledger --> DB
    Chat --> Notif
    Auth --> DB
    Marketplace --> Cloud
```

---

## 4.4 Database Design

The AgroNexa LK platform uses PostgreSQL as its relational database management system.

The database stores information related to:
* Users
* User Roles
* Crop Listings
* Equipment Listings
* Equipment Bookings
* Broadcast Requests
* Buyer Responses
* Messages
* Notifications
* Audit Logs
* Rental Ledger

Primary keys uniquely identify records, while foreign keys establish relationships among tables to ensure referential integrity.

**Figure 4.2: Entity Relationship Diagram (ER Diagram)**

```mermaid
erDiagram
    USERS {
        int id PK
        varchar role
        varchar first_name
        varchar last_name
        varchar email UK
        varchar phone UK
        varchar district
        text address
        varchar nic_number
        varchar password_hash
        text nic_front_path
        text nic_back_path
        varchar status
        text rejection_reason
        int failed_login_attempts
        timestamptz locked_until
        varchar reset_token
        timestamptz reset_token_expires
        boolean sms_notifications
        text profile_photo_path
        timestamptz created_at
        timestamptz updated_at
    }

    CROP_LISTINGS {
        int id PK
        int seller_id FK
        varchar name
        varchar category
        numeric quantity_kg
        numeric price_per_kg
        varchar district
        date available_date
        text description
        text_array photos
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    EQUIPMENT_LISTINGS {
        int id PK
        int owner_id FK
        varchar name
        varchar type
        text description
        numeric rental_rate
        varchar district
        varchar condition
        text_array photos
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    EQUIPMENT_BOOKINGS {
        int id PK
        int listing_id FK
        int renter_id FK
        int owner_id FK
        date start_date
        date end_date
        numeric total_amount
        numeric extra_charges
        text return_notes
        timestamptz returned_at
        varchar status
        timestamptz created_at
    }

    BUYER_REQUESTS {
        int id PK
        int buyer_id FK
        varchar buyer_name
        varchar crop
        varchar category
        varchar quantity
        varchar unit
        varchar quality
        varchar urgency
        varchar budget
        varchar price_type
        varchar payment_method
        varchar payment_terms
        varchar delivery_type
        varchar district
        text address
        date needed_by
        varchar phone
        varchar whatsapp
        varchar email
        text notes
        varchar status
        timestamptz expires_at
        timestamptz created_at
    }

    CROP_ORDERS {
        int id PK
        int crop_listing_id FK
        int buyer_id FK
        int seller_id FK
        numeric quantity_kg
        numeric price_per_kg
        numeric total_amount
        date delivery_date
        varchar status
        timestamptz created_at
    }

    REQUEST_RESPONSES {
        int id PK
        int request_id FK
        int seller_id FK
        varchar type
        numeric price
        varchar quantity
        text message
        timestamptz created_at
    }

    RENTAL_LEDGER {
        int id PK
        varchar tx_id UK
        int listing_id
        varchar listing_type
        int renter_id FK
        int owner_id FK
        numeric amount
        int duration_days
        varchar prev_hash
        varchar block_hash
        varchar agreement_hash
        timestamptz created_at
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        varchar type
        varchar title
        text body
        boolean is_read
        timestamptz created_at
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        varchar action
        varchar ip_address
        text details
        timestamptz created_at
    }

    DIRECT_MESSAGES {
        int id PK
        int sender_id FK
        int receiver_id FK
        text message
        text attachment_url
        varchar attachment_type
        boolean is_read
        timestamptz created_at
    }

    TRANSPORT_PROVIDERS {
        int id PK
        int owner_id FK
        varchar owner_name
        varchar vehicle_type
        varchar vehicle_no UK
        numeric capacity_kg
        varchar district
        varchar phone
        numeric rate_per_km
        varchar status
        timestamptz created_at
    }

    TRANSPORT_BOOKINGS {
        int id PK
        int provider_id FK
        int requester_id FK
        varchar requester_name
        varchar commodity_name
        numeric quantity_kg
        text pickup_address
        text delivery_address
        numeric price
        numeric distance
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    USERS ||--o{ CROP_LISTINGS : "creates"
    USERS ||--o{ EQUIPMENT_LISTINGS : "owns"
    USERS ||--o{ EQUIPMENT_BOOKINGS : "renter/owner"
    USERS ||--o{ BUYER_REQUESTS : "initiates"
    USERS ||--o{ CROP_ORDERS : "buyer/seller"
    USERS ||--o{ REQUEST_RESPONSES : "seller_submits"
    USERS ||--o{ RENTAL_LEDGER : "transacts"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ AUDIT_LOGS : "triggers"
    USERS ||--o{ DIRECT_MESSAGES : "sends/receives"
    USERS ||--o{ TRANSPORT_PROVIDERS : "registers"
    USERS ||--o{ TRANSPORT_BOOKINGS : "books"

    CROP_LISTINGS ||--o{ CROP_ORDERS : "ordered_from"
    EQUIPMENT_LISTINGS ||--o{ EQUIPMENT_BOOKINGS : "booked_from"
    BUYER_REQUESTS ||--o{ REQUEST_RESPONSES : "responds_to"
    TRANSPORT_PROVIDERS ||--o{ TRANSPORT_BOOKINGS : "fulfills"
```

---

## 4.5 Database Schema

The primary database tables are:

| Table         | Purpose                      |
| ------------- | ---------------------------- |
| users         | Stores user information      |
| crop_listings | Stores agricultural products |
| equipment     | Stores rental equipment      |
| bookings      | Stores equipment bookings    |
| broadcasts    | Buyer procurement requests   |
| responses     | Farmer responses             |
| messages      | Live chat messages           |
| notifications | System notifications         |
| audit_logs    | User activity logs           |
| rental_ledger | SHA-256 transaction records  |

---

## 4.6 Use Case Diagram

The system supports three user roles:

### Administrator
* Login
* Verify KYC
* Manage Users
* View Statistics
* Export Reports
* Verify Ledger

### Farmer
* Register
* Login
* Add Crop Listing
* Edit Listing
* Delete Listing
* Add Equipment
* Confirm Bookings
* Respond to Broadcasts
* Chat

### Corporate Buyer
* Register
* Login
* Browse Marketplace
* Express Interest
* Create Broadcast
* Book Equipment
* Verify Ledger
* Chat

**Figure 4.3: Use Case Diagram**

```mermaid
graph LR
    %% Actors
    Admin((Administrator))
    Farmer((Farmer))
    Buyer((Corporate Buyer))

    %% Boundary
    subgraph AgroNexa_LK_System["AgroNexa LK Platform Boundary"]
        %% Common Use Cases
        UC_Auth["Login / Authentication"]
        UC_Chat["Live Chat (Socket.IO)"]
        UC_Ledger["Verify Ledger Integrity"]

        %% Admin Use Cases
        UC_KYC["Verify KYC Documents"]
        UC_Manage_Users["Manage User Accounts"]
        UC_Stats["View System Statistics"]
        UC_Report["Export PDF Reports"]

        %% Farmer Use Cases
        UC_Reg["User Registration"]
        UC_Crop["Manage Crop Listings"]
        UC_Equip_List["Add Equipment Listings"]
        UC_Confirm_Book["Confirm Equipment Bookings"]
        UC_Resp_Broad["Respond to Broadcast Requests"]

        %% Buyer Use Cases
        UC_Browse["Browse Crop Marketplace"]
        UC_Book_Equip["Book Equipment Rental"]
        UC_Create_Broad["Create Broadcast Request"]
    end

    %% Actor to Use Case Relationships
    Farmer --> UC_Reg
    Farmer --> UC_Auth
    Farmer --> UC_Crop
    Farmer --> UC_Equip_List
    Farmer --> UC_Confirm_Book
    Farmer --> UC_Resp_Broad
    Farmer --> UC_Chat

    Buyer --> UC_Reg
    Buyer --> UC_Auth
    Buyer --> UC_Browse
    Buyer --> UC_Book_Equip
    Buyer --> UC_Create_Broad
    Buyer --> UC_Ledger
    Buyer --> UC_Chat

    Admin --> UC_Auth
    Admin --> UC_KYC
    Admin --> UC_Manage_Users
    Admin --> UC_Stats
    Admin --> UC_Report
    Admin --> UC_Ledger
```

---

## 4.7 Activity Diagrams

Activity diagrams illustrate the workflow of major business processes.

The following activity diagrams are included:
* User Registration
* KYC Approval
* Crop Publishing
* Equipment Booking
* Broadcast Request
* Ledger Verification

**Figure 4.4: User Registration Activity Diagram**

```mermaid
flowchart TD
    Start([Start]) --> Input[User Fills Registration Form]
    Input --> SelectRole{Select Role?}

    SelectRole -- Farmer / Buyer --> UploadNIC[Upload NIC Front & Back Details]
    SelectRole -- Standard / Other --> SubmitForm[Submit Form Data]

    UploadNIC --> SubmitForm
    SubmitForm --> HashPass[Hash Password via BCrypt]
    HashPass --> DBInsert[Insert User Record with Status = 'pending']
    
    DBInsert --> EmailSent[Send Welcome Notification]
    EmailSent --> End([End - Awaiting Admin KYC Verification])
```

---

## 4.8 Sequence Diagrams

Sequence diagrams describe interactions among users, frontend, backend services, and database.

Major sequence diagrams include:
* User Login
* Crop Publishing
* Equipment Booking
* Broadcast Request
* Chat Communication
* Ledger Generation

**Figure 4.5: Equipment Booking Sequence Diagram**

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Corporate Buyer
    participant FE as React Frontend
    participant BE as Express API Server
    participant DB as PostgreSQL Database
    participant LS as Ledger Service (SHA-256)

    Buyer->>FE: Select Equipment & Click "Book Now"
    FE->>BE: POST /api/bookings (ListingID, Dates)
    BE->>DB: Query Listing Availability & Details
    DB-->>BE: Details Returned (Rate, OwnerID)
    
    BE->>BE: Calculate Total Amount
    BE->>DB: Insert Booking (Status: Pending)
    DB-->>BE: Booking Inserted Successfully

    BE->>DB: Fetch Owner (Seller) Device / Info
    DB-->>BE: Owner Info Returned
    BE-->>FE: Return Booking Confirmation Pending
    FE-->>Buyer: Show "Booking Request Sent to Owner"

    Note over BE, DB: Owner Accepts Booking
    actor Owner as Seller / Owner
    Owner->>FE: Accept Booking
    FE->>BE: POST /api/bookings/:id/confirm
    BE->>DB: Update Booking Status = 'confirmed'
    
    BE->>DB: Get Previous Ledger Block Hash
    DB-->>BE: Previous Hash Returned (e.g. 09f87a...)
    
    BE->>LS: Generate Block (Tx Data + Prev Hash)
    LS->>LS: Calculate SHA-256 block_hash & agreement_hash
    LS-->>BE: Returns Block Hashes

    BE->>DB: INSERT INTO rental_ledger (tx_id, prev_hash, block_hash, agreement_hash)
    DB-->>BE: Ledger Block Saved
    
    BE-->>FE: Return Booking Confirmed & Secured
    FE-->>Buyer: Show Secured Receipt & Booking Complete
```

---

## 4.9 Component Diagram

The AgroNexa LK system consists of the following components:
* React Frontend
* Authentication API
* Marketplace API
* Booking API
* Notification Service
* Socket.IO Server
* Ledger Service
* PostgreSQL Database
* Cloudinary Storage

These components interact through REST APIs and WebSocket communication.

**Figure 4.6: Component Diagram**

```mermaid
graph TD
    subgraph User_Interface["User Interface Component (Vite + React)"]
        UI_Component["React Web UI"]
        HTTP_Client["Axios HTTP Client"]
        Socket_Client["Socket.IO Client"]
        UI_Component --> HTTP_Client
        UI_Component --> Socket_Client
    end

    subgraph Backend_Application["Backend Application Component (Express.js)"]
        Router["Express Router"]
        Controller["Controllers Modules"]
        Auth_Srv["Auth Service (JWT)"]
        Ledger_Srv["Ledger Chaining Service"]
        Socket_Srv["Socket.IO Messaging Service"]

        Router --> Controller
        Controller --> Auth_Srv
        Controller --> Ledger_Srv
        Controller --> Socket_Srv
    end

    subgraph Infrastructure_Layer["Infrastructure Layer"]
        DB_Driver["PG Node Client Pool"]
        Postgres[("PostgreSQL Server")]
        Cloud_Store["Cloudinary Storage API"]
    end

    %% Connections
    HTTP_Client -- "REST API (JSON/HTTPS)" --> Router
    Socket_Client -- "WebSockets" --> Socket_Srv
    Controller --> DB_Driver
    DB_Driver --> Postgres
    Controller --> Cloud_Store
```

---

## 4.10 Deployment Architecture

The deployment architecture separates the frontend, backend, and database services.

### Frontend
Hosted on Vercel.

### Backend
Hosted on Railway.

### Database
PostgreSQL hosted on Railway.

### Cloud Storage
Cloudinary stores uploaded crop images and KYC documents.

### Communication
REST API over HTTPS and Socket.IO for real-time communication.

**Figure 4.7: Deployment Diagram**

```mermaid
graph TD
    subgraph Client_Environment["Client Environment"]
        Client_Node["User Device (Web Browser)"]
    end

    subgraph Vercel_Platform["Vercel Cloud Hosting"]
        Web_Server["React Frontend Build (Static Assets)"]
    end

    subgraph Railway_Platform["Railway Production Platform"]
        API_Node["Backend Web Service (Node.js/Express)"]
        DB_Node[("PostgreSQL Database Node")]
    end

    subgraph Cloudinary_Platform["Cloudinary CDN"]
        Storage_Node["Static Image & Document Bucket"]
    end

    %% Communication Links
    Client_Node -- "Loads Static Site (HTTPS)" --> Web_Server
    Client_Node -- "REST API Request (HTTPS)" --> API_Node
    Client_Node -- "Real-Time Message (WebSockets)" --> API_Node
    API_Node -- "Internal Query (Port 5432)" --> DB_Node
    API_Node -- "Uploads Assets / Fetches URLs" --> Storage_Node
```

---

## 4.11 Security Architecture

The AgroNexa LK platform incorporates multiple security mechanisms.
* OTP Verification
* JWT Authentication
* Password Hashing
* Role-Based Access Control (RBAC)
* KYC Verification
* HTTPS Communication
* SQL Injection Prevention
* Input Validation
* Audit Logging
* Cryptographic Ledger Verification

These mechanisms collectively improve system confidentiality, integrity, and availability.

---

## 4.12 Cryptographic Ledger Design

One of the unique features of AgroNexa LK is the blockchain-inspired cryptographic ledger.

Whenever an equipment rental booking is confirmed:
1. Booking information is collected.
2. The previous block hash is retrieved.
3. A new SHA-256 hash is generated.
4. The new block is stored in the **rental_ledger** table.
5. During verification, all hashes are recalculated to detect unauthorized modifications.

This mechanism provides immutable transaction verification without implementing a decentralized blockchain network.

**Figure 4.8: Cryptographic Ledger Workflow**

```mermaid
graph LR
    subgraph Block_N_Minus_1["Ledger Block N-1"]
        Prev_Hash_Data["Previous Hash"]
        Tx_Data_1["Transaction Data N-1"]
        Hash_N_Minus_1["Block Hash N-1 (SHA-256)"]
    end

    subgraph Block_N["Ledger Block N"]
        Prev_Hash_N["Previous Hash = Hash N-1"]
        Tx_Data_N["Transaction Data N: <br/> Renter ID, Owner ID, <br/> Amount, Duration"]
        Calc_Block_N["agreement_hash = SHA256(Tx Data N) <br/> block_hash = SHA256(Prev Hash + agreement_hash)"]
        Hash_N["Block Hash N"]
    end

    subgraph Block_N_Plus_1["Ledger Block N+1"]
        Prev_Hash_N_Plus_1["Previous Hash = Hash N"]
        Tx_Data_N_Plus_1["Transaction Data N+1"]
        Calc_Block_N_Plus_1["block_hash = SHA256(Prev Hash + agreement_hash)"]
        Hash_N_Plus_1["Block Hash N+1"]
    end

    Hash_N_Minus_1 --> Prev_Hash_N
    Tx_Data_N --> Calc_Block_N
    Prev_Hash_N --> Calc_Block_N
    Calc_Block_N --> Hash_N
    Hash_N --> Prev_Hash_N_Plus_1
    Tx_Data_N_Plus_1 --> Calc_Block_N_Plus_1
    Prev_Hash_N_Plus_1 --> Calc_Block_N_Plus_1
    Calc_Block_N_Plus_1 --> Hash_N_Plus_1
```

---

## 4.13 User Interface Design

The user interface was designed according to modern web usability principles.

Main interfaces include:
* Landing Page
* Registration Page
* Login Page
* Farmer Dashboard
* Buyer Dashboard
* Administrator Dashboard
* Marketplace
* Equipment Rental
* Broadcast Request
* Live Chat
* Ledger Verification

Each interface follows a responsive design compatible with desktops, tablets, and smartphones.

### Low-Fidelity UI Layouts

Below are the wireframe structures representing the interface layouts before high-fidelity visual assets are integrated.

#### User Login Wireframe
The login interface incorporates a split two-column design focusing on user entry credentials and tab selection.
![User Login Page Wireframe](diagrams/low_fidelity_login.png)

#### Register and Seller Register Wireframes
Split interfaces with fields to choose role paths and optionally submit registration details alongside NIC verification uploads.
![Register Page Wireframe](diagrams/low_fidelity_register.png)
![Seller Register Page Wireframe](diagrams/low_fidelity_seller_register.png)

#### Buyer Dashboard Wireframe
Shows the structural widgets layout for crop listings searching, direct purchasing, and broadcasting.
![Buyer Dashboard Wireframe](diagrams/low_fidelity_buyer_dashboard.png)

#### Farmer / Seller Dashboard Wireframe
Structured panels displaying crop listings table, analytics overview charts, and ledger ledger transactions.
![Seller / Farmer Dashboard Wireframe](diagrams/low_fidelity_seller_dashboard.png)

#### Administrator Panel Wireframe
Administrative module structure showing verification approvals pipelines and system logs views.
![Admin Dashboard Wireframe](diagrams/low_fidelity_admin_dashboard.png)

---

## 4.14 Chapter Summary

This chapter presented the overall system design of the AgroNexa LK Smart Farming Platform. It described the three-tier architecture, software modules, database design, UML diagrams, deployment architecture, security mechanisms, and the blockchain-inspired cryptographic ledger. The design provides a scalable, secure, and maintainable foundation for the implementation discussed in the next chapter.
