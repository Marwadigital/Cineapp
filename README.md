# 🎬 CineBook - Production-Ready Cinema Ticket-Booking Platform

[![Next.js 15](https://img.shields.io/badge/Next.js-15_App_Router-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL_Serverless-00E599?style=flat-square&logo=postgresql)](https://neon.tech/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat-square)](https://orm.drizzle.team/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

CineBook is a production-grade cinema ticketing and seat reservation web application architected for instantaneous deployment on **Vercel** with **Neon Serverless PostgreSQL**. Built with Next.js 15 App Router, Drizzle ORM, and Tailwind CSS.

---

## 👥 The CineBook Agent Team

The platform was built and validated cooperatively by three specialized autonomous agents:

| Agent | Responsibility | Key Deliverables |
| :--- | :--- | :--- |
| **Agent 1: App Agent** | Frontend Architecture & UX | High-fidelity dark cinema theme, movie catalog search & multi-filter, interactive theater seat selection map, checkout flow, SVG QR admission tickets, booking history & cancellations, operations admin dashboard. |
| **Agent 2: Database Engine Agent** | Data Engine & Concurrency | 14 relational tables in PostgreSQL, Drizzle migrations, row-level locking (`SELECT ... FOR UPDATE`), 10-step atomic booking protocol, payment idempotency keys, and scheduled hold expiration cleanup (`/api/cron/release-holds`). |
| **Agent 3: QA Agent** | Automated Validation Suite | 26 automated integration tests including **simultaneous concurrent seat booking race condition**, hold timeouts, pricing math (in integer minor units), authorization isolation, and Vercel production build validation. |

---

## 🚀 Key Features

- **Interactive Curved Theater Seat Map**: Realistic cinema seating curve with screen projection glow. Supports **Standard**, **VIP**, **Recliner**, and **Wheelchair** tiers with real-time seat availability (`AVAILABLE`, `HELD`, `BOOKED`, `BLOCKED`).
- **10-Step ACID Transaction Protocol**: Prevents double booking under high concurrency with PostgreSQL row-level locks (`FOR UPDATE`).
- **10-Minute Temporary Seat Hold**: Automatically expires and reverts to the public pool via idempotent serverless endpoints.
- **Integer Minor Unit Financials**: All currency stored as cents (e.g., $15.00 stored as `1500`) eliminating floating-point rounding errors.
- **Digital Tickets with Real QR Codes**: Renders high-contrast admission passes with cryptographic reference codes and scan verification payloads.
- **Free User Cancellations**: Customers can cancel eligible upcoming bookings prior to showtime start with instant seat return and refund logging.
- **Operations Console (Admin)**: Real-time revenue telemetry, occupancy rate metrics, movie catalog manager, showtime scheduler, and live security audit logs.
- **Zero Secrets in Browser Code**: Complete separation of database pooling credentials, payment secrets, and JWT signing keys on the server.

---

## 🗄️ Database Architecture

Entity-relationship model powered by Neon PostgreSQL:

1. **`users`** – UUID PK, email, bcrypt password hash, role (`user` | `admin`).
2. **`genres`** – UUID PK, unique name, unique slug.
3. **`movies`** – UUID PK, title, slug, poster, backdrop, duration, rating, language, is_featured.
4. **`movie_genres`** – Composite PK junction table linking movies and genres with cascade deletes.
5. **`cinemas`** – UUID PK, name, slug, address, city, state, postal code, phone, image.
6. **`auditoriums`** – UUID PK, cinema_id FK, screen type (`STANDARD`, `IMAX`, `DOLBY_CINEMA`, `VIP`), total seats. Unique on `(cinema_id, name)`.
7. **`seats`** – UUID PK, auditorium_id FK, row_label, seat_number, seat_type, price_multiplier. Unique on `(auditorium_id, row_label, seat_number)`.
8. **`showtimes`** – UUID PK, movie_id FK, auditorium_id FK, start_time, end_time, base_price_cents, format.
9. **`showtime_seats`** – UUID PK, showtime_id FK, seat_id FK, status (`AVAILABLE`, `HELD`, `BOOKED`, `BLOCKED`), held_until, booking_id, price_cents. Unique on `(showtime_id, seat_id)`.
10. **`bookings`** – UUID PK, user_id FK, showtime_id FK, booking_reference unique, status (`PENDING`, `CONFIRMED`, `CANCELLED`, `EXPIRED`), subtotal, fees, tax, total in cents, expires_at.
11. **`booking_items`** – UUID PK, booking_id FK, showtime_seat_id FK, seat_id FK, unit_price_cents.
12. **`payments`** – UUID PK, booking_id FK, user_id FK, amount_cents, currency, provider, idempotency_key unique, status (`PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED`).
13. **`tickets`** – UUID PK, booking_id FK, showtime_seat_id FK, ticket_code unique, qr_payload, is_used.
14. **`audit_logs`** – UUID PK, user_id FK, action, entity_type, entity_id, details jsonb, ip_address, created_at.

---

## 📦 Getting Started Locally

### Prerequisites
- Node.js 18+ (tested on Node v26)
- npm or pnpm

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/cinebook.git
cd cinebook
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file:
```env
# Neon PostgreSQL (Direct or pooled URL from Vercel Marketplace)
DATABASE_URL="postgresql://neondb_owner:password@ep-cool-pool-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:password@ep-cool-pool-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Auth Session Signing Secret
AUTH_SECRET="cinebook_super_secret_auth_token_key_change_in_production_32chars"

# Cron Job Protection Secret
CRON_SECRET="cinebook_cron_secret_token_987654321"

# Payment Provider Test Keys
STRIPE_SECRET_KEY="sk_test_mock_cinebook_stripe_key_placeholder"
STRIPE_WEBHOOK_SECRET="whsec_mock_cinebook_webhook_secret"

# Public URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
*(Note: If `DATABASE_URL` is omitted locally, CineBook automatically activates an embedded WASM PostgreSQL fallback so you can develop and run tests with zero external database setup!)*

### 3. Seed Database
Run the seed script to populate sample movies, IMAX cinemas, seating grids, and showtimes:
```bash
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing (Agent 3 - QA Suite)

Run the full integration test suite:
```bash
npm run test:qa
```

This verifies:
1. **Authentication**: Bcrypt hashing, password validation, JWT session cookie verification.
2. **Movie Filtering**: Title, genre, language, cinema, and date query execution.
3. **End-to-End Booking Flow**: Holds seats -> price check -> test payment -> tickets with QR code.
4. **Concurrent Race Condition**: Two sessions simultaneously attempt to book the exact same seat; asserts that **exactly 1 succeeds and 1 is rejected with 409 Conflict**.
5. **Expired Seat Hold Release**: Simulates past hold timestamps and validates automatic release back to `AVAILABLE`.
6. **Payment Idempotency**: Submits duplicate payment requests with identical idempotency keys; verifies no duplicate bookings or charges occur.
7. **Security Isolation**: Asserts that User A cannot view, retrieve, or cancel User B's tickets.
8. **Cancellation**: Reverts booked seats to `AVAILABLE` and marks refund in audit logs.

---

## 🚢 Vercel Deployment Instructions

### Step 1: Push Code to GitHub / GitLab
```bash
git init
git add .
git commit -m "feat: complete CineBook production release"
git remote add origin <your-git-repo-url>
git push -u origin main
```

### Step 2: Import into Vercel
1. Navigate to the [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." -> "Project"**.
2. Select your CineBook repository.
3. Framework Preset: **Next.js**.

### Step 3: Provision Neon PostgreSQL through Vercel Marketplace
1. In the Vercel Project Dashboard, navigate to the **Storage** tab.
2. Click **Connect Store** and choose **Neon (Serverless Postgres)** from the Marketplace.
3. Vercel will automatically configure:
   - `DATABASE_URL` (Pooled connection string)
   - `DATABASE_URL_UNPOOLED` (Direct connection string)

### Step 4: Configure Production Environment Variables
Under Project Settings -> **Environment Variables**, set:
- `AUTH_SECRET`: A 32+ character random string (generate with `openssl rand -base64 32`).
- `CRON_SECRET`: Secret token for scheduled seat releases.
- `STRIPE_SECRET_KEY`: Your Stripe test/live secret key.
- `NEXT_PUBLIC_APP_URL`: Your Vercel production URL (e.g. `https://cinebook.vercel.app`).

### Step 5: Database Migrations on Vercel
Add the migration command to your Vercel Build settings or run before deploying:
```bash
npx drizzle-kit migrate
# or run seed for initial deployment:
npm run db:seed
```

### Step 6: Configure Vercel Cron for Hold Releases (Optional)
Add a `vercel.json` file in the project root:
```json
{
  "crons": [
    {
      "path": "/api/cron/release-holds",
      "schedule": "*/5 * * * *"
    }
  ]
}
```
Vercel will automatically pass the `CRON_SECRET` header when calling this endpoint every 5 minutes.

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@cinebook.com` | `User123!` | Book movies, pick seats, view tickets & QR, cancel bookings |
| **Administrator** | `admin@cinebook.com` | `Admin123!` | Metrics dashboard, movie catalog management, showtime scheduler, audit stream |

---

## 📄 License

Distributed under the MIT License. Built with ❤️ by the CineBook team.
