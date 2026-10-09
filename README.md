# Horizon Travel Assistance — Client Application & Travel Assistance Portal

A production-oriented client application portal: a multi-step public application form with
document uploads and M-Pesa Daraja payment, plus a role-based admin dashboard for managing
applications, payments, settings and reports.

> **Not affiliated with IOM, UNHCR, any embassy, or any government.** This is an independent
> agency's own client portal, branded as "Horizon Travel Assistance" by default — rename it in
> Admin → Settings.

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Data Model](#data-model)
6. [Application Lifecycle & Payment Flow](#application-lifecycle--payment-flow)
7. [API Reference](#api-reference)
8. [Security](#security)
9. [Setup & Running](#setup--running)
10. [Deploy to Production](#deploy-to-production)
11. [Key Business Rules](#key-business-rules)
12. [Admin Roles](#admin-roles)

---

## Features

### Public site
- **Landing page** with agency branding (name, logo, custom hero headline, contact details) and an
  optional auto-sliding **hero image slideshow** — all configurable from the admin Settings page.
- **Multi-step application wizard** (8 steps) with a progress bar:
  1. Applicant information (name, date of birth, passport photo)
  2. Family members (any number; name, relationship, date of birth)
  3. Refugee / settlement stay info and manifest (refugee ID, manifest card upload; the manifest
     section can be made mandatory in Settings)
  4. Sponsor information (name, relationship, Kenyan phone number, passport photo)
  5. Document uploads
  6. Review and consent (accuracy confirmation + Terms & Privacy agreement)
  7. M-Pesa payment
  8. Confirmation with the application reference number
- **Autosave & resume** — debounced autosave of each step to the server, so a refresh only loses the
  last second or two of typing; drafts remember `currentStep`.
- **M-Pesa STK Push payment** with live status polling and retry on failure/cancel.
- **Application status checker** (`/status`) — look up progress with application number + the
  sponsor's phone number (rate limited).
- **Terms** and **Privacy** pages, a floating **WhatsApp** contact button, and a public footer.
- Kenyan phone number validation/normalisation (`07…`, `01…`, `+254…`, `254…` → `254XXXXXXXXX`).

### Admin dashboard (`/admin`)
- **Dashboard** with headline stats, visible to every admin role.
- **Applications list** with search (name / sponsor), filters (status, payment status, date range)
  and pagination.
- **Application detail**: every field, secure document viewing, status history timeline, payment
  attempts, internal admin notes, status updates, and a printable **PDF summary**.
- **Payments** page listing every STK push attempt with receipt numbers and result codes.
- **Reports**: summary figures plus **CSV export** of applications and payments.
- **Settings** (Super Admin): agency name/headline/logo/hero images, contact info, WhatsApp number,
  application fee (KES), application-number prefix, manifest-required toggle, M-Pesa config status.
- **Admin users** (Super Admin): create accounts, assign roles, activate/deactivate.
- **Email notifications**: admins are emailed when a new application is submitted (payment
  confirmed) and, optionally, when a payment fails/is cancelled/expires. Recipients, toggles and a
  "Send test email" button are in Admin → Settings, along with the mail server (SMTP) details, so
  the owner can configure email without touching the server.
- **Role-based access control** with four roles (see [Admin Roles](#admin-roles)).

### Backend
- Atomic, year-scoped application numbers (`APP-2026-000001`).
- Idempotent payment processing shared by the Daraja callback and an active status-query fallback.
- Full audit trail of status changes (`ApplicationStatusHistory`).
- Rate limiting, input validation, NoSQL-injection sanitisation, Helmet headers, graceful shutdown.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6, Axios |
| Backend | Node.js (≥ 18), Express 4 |
| Database | MongoDB via Mongoose 8 |
| Auth | JWT (httpOnly cookie + bearer token), bcrypt password hashing (`bcryptjs`) |
| Payments | M-Pesa Daraja API (STK Push, callback + status query) |
| Uploads | Multer with server-generated filenames, authenticated-only access |
| Reports | PDFKit (PDF summaries), CSV export |
| Email | Nodemailer (any SMTP provider) |
| Security | Helmet, CORS, express-rate-limit, express-validator, express-mongo-sanitize |

---

## Architecture

```
┌──────────────────────┐        HTTPS / JSON         ┌───────────────────────────┐
│  React SPA (Vite)    │ ──────────────────────────▶ │  Express API              │
│  - Public site       │ ◀────────────────────────── │  /api/auth                │
│  - Apply wizard      │   cookie (JWT) / bearer     │  /api/applications        │
│  - Admin dashboard   │                             │  /api/payments            │
└──────────────────────┘                             │  /api/public              │
                                                     │  /api/admin               │
                                                     └──────┬──────────┬─────────┘
                                                            │          │
                                              Mongoose      │          │ axios
                                                            ▼          ▼
                                                     ┌──────────┐  ┌─────────────────┐
                                                     │ MongoDB  │  │ Safaricom Daraja │
                                                     └──────────┘  │ (STK Push)       │
                                                                   └────────┬────────┘
                                          POST /api/payments/mpesa/callback │
                                          ◀─────────────────────────────────┘
```

**Backend** follows a layered layout: `routes` → `middleware` (auth, validation, rate limiting,
uploads) → `controllers` → `services` / `models` / `utils`. Errors are thrown as `ApiError` and
handled centrally by `errorHandler`; async controllers are wrapped by `asyncHandler`.

**Frontend** is organised into `pages` (route-level screens), `components` (layout, form fields,
admin helpers), `context` (Auth, Settings, ApplicationDraft state), `api` (typed Axios wrappers),
`hooks` (e.g. `useDebouncedAutosave`) and `utils`. Admin routes are guarded by `ProtectedRoute`;
public branding is loaded once via `SettingsProvider`.

---

## Project Structure

```
backend/
  server.js                      Entry point: connect DB, start server, graceful shutdown
  src/
    app.js                       Express app: middleware stack and route mounting
    config/                      env.js (typed env), db.js (Mongo connection)
    controllers/                 auth, application, payment, public, settings, report,
                                 adminApplication / adminDashboard / adminPayment / adminUser
    middleware/                  auth (requireAuth, requireRole), validate, errorHandler,
                                 rateLimiter, upload (private docs), logoUpload (public images),
                                 draftAccess (X-Draft-Token check for public drafts)
    models/                      Application, Payment, AdminUser, Settings, Counter,
                                 ApplicationStatusHistory, schemas/ (document, familyMember, sponsor)
    routes/                      auth, application, payment, public, admin
    services/                    applicationNumberService, mpesaService (Daraja client),
                                 paymentProcessingService (applyResultToPayment),
                                 notificationService (admin emails)
    scripts/                     createAdmin.js, seedSettings.js
    utils/                       ApiError, asyncHandler, phoneUtils, applicationCompleteness,
                                 constants, csv
  test/                          node:test unit + HTTP smoke tests
  uploads/                       Private applicant documents; uploads/public/ for logo & hero images

frontend/
  src/
    App.tsx, main.tsx            Router and providers
    api/                         client (Axios instance), applications, payments, auth, admin, types
    components/
      admin/                     ProtectedRoute, SecureImage, StatusBadge, Pager
      apply/                     WizardStepShell
      form/                      TextField, SelectField, DateField, FileUploadField, ProgressBar
      layout/                    PublicLayout/Header/Footer, AdminLayout, WhatsAppButton
      public/                    HeroSlideshow
    context/                     AuthContext, SettingsContext, ApplicationDraftContext
    hooks/                       useDebouncedAutosave
    pages/
      public/                    Landing, StatusChecker, Terms, Privacy
      apply/                     ApplyWizard + steps/Step1…Step8
      admin/                     Login, Dashboard, ApplicationsList, ApplicationDetail,
                                 Payments, Reports, Settings, AdminUsers
    utils/                       constants (statuses, badge colours, roles), phone, download, format
```

---

## Data Model

| Collection | Purpose |
|---|---|
| `Application` | The client application: applicant, family members, manifest info, refugee stay, sponsor, consent, status, payment status, admin notes, fee snapshot, `currentStep` |
| `Payment` | One document per STK push attempt: phone, amount, `checkoutRequestId`, M-Pesa receipt, result code/description, raw STK response and raw callback |
| `ApplicationStatusHistory` | Audit log of every status transition (who, from, to, note) |
| `AdminUser` | Admin accounts: name, email, bcrypt `passwordHash` (never selected by default), role, `isActive`, `lastLoginAt` |
| `Settings` | Singleton (`GLOBAL_SETTINGS`): agency branding/contact, fee, number prefix, manifest toggle, notification recipients/toggles, non-secret M-Pesa status |
| `Counter` | Atomic per-prefix-per-year sequence for application numbers |

**Application statuses**: `DRAFT`, `AWAITING_PAYMENT`, `PAID`, `SUBMITTED`, `UNDER_REVIEW`,
`ADDITIONAL_INFO_REQUIRED`, `PROCESSING`, `APPROVED`, `COMPLETED`, `DECLINED`, `CANCELLED`.

**Payment statuses**: `PENDING`, `PAID`, `FAILED`, `CANCELLED`, `EXPIRED`.

**Document types**: `APPLICANT_PASSPORT_PHOTO`, `MANIFEST_CARD`, `SPONSOR_PASSPORT_PHOTO`
(JPG/PNG only, max size set by `MAX_FILE_SIZE_MB`).

**Sponsor relationships**: Parent, Brother/Sister, Spouse, Relative, Friend, Other.

---

## Application Lifecycle & Payment Flow

```
DRAFT ──(review + consent, completeness check)──▶ AWAITING_PAYMENT
      ──(verified M-Pesa success)──▶ SUBMITTED ──▶ UNDER_REVIEW ──▶ PROCESSING ──▶ APPROVED ──▶ COMPLETED
                                                       │                                  └──▶ DECLINED
                                                       └──▶ ADDITIONAL_INFO_REQUIRED      (or CANCELLED)
```

1. Client completes steps and the server saves incrementally (`PATCH /api/applications/:id`).
2. `POST /api/applications/:id/review` runs `applicationCompleteness` and moves the application to
   `AWAITING_PAYMENT`, assigning the application number and snapshotting the fee
   (`applicationFeeAtSubmission`).
3. `POST /api/payments/initiate` creates a `Payment` and sends an STK Push. A pending payment
   created in the last 90 s is reused so the client is never double-prompted.
4. Safaricom calls `POST /api/payments/mpesa/callback`; the client polls
   `GET /api/payments/status/:checkoutRequestId`, which falls back to an active Daraja status
   query if the callback is late (and marks the attempt `EXPIRED` after 5 minutes without a result).
5. Both paths go through one `applyResultToPayment` function (idempotent): `ResultCode 0` →
   payment `PAID`, application `SUBMITTED`, history entry written; `1032` → `CANCELLED`; `1037` →
   `EXPIRED`; anything else → `FAILED` (application stays `AWAITING_PAYMENT` so the client can retry).
6. Admins then move the application through the remaining statuses; every change is logged.

---

## API Reference

All responses use `{ success, data | message }`. Base path: `/api`.

### Public / client
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/public/settings` | Non-secret branding and fee info |
| POST | `/public/status-check` | Status lookup by application number + sponsor phone (rate limited) |
| POST | `/applications` | Start a new draft application (returns a one-time `draftToken`) |
| GET | `/applications/:id` | Fetch a draft |
| PATCH | `/applications/:id` | Save a section (autosave) |
| POST | `/applications/:id/documents/:type` | Upload a document (multipart, field `file`) |
| POST | `/applications/:id/review` | Validate completeness and move to `AWAITING_PAYMENT` |
| POST | `/payments/initiate` | Send M-Pesa STK Push (rate limited) |
| POST | `/payments/mpesa/callback` | Daraja callback (called by Safaricom) |
| GET | `/payments/status/:checkoutRequestId` | Poll payment status |

Draft endpoints (`/applications/:id…` and `/payments/initiate`) require the `X-Draft-Token`
header returned when the draft was created. The frontend keeps it in `localStorage`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Admin login (rate limited: 10 / 15 min) |
| POST | `/auth/logout` | Clear session cookie |
| GET | `/auth/me` | Current admin |

### Admin (`/admin/*`, authentication required)
| Method | Path | Roles |
|---|---|---|
| GET | `/dashboard/stats` | All admin roles |
| GET | `/applications`, `/applications/:id` | Super Admin, Application Officer, Viewer |
| GET | `/applications/:id/documents/:type` | Super Admin, Application Officer, Viewer |
| GET | `/applications/:id/summary.pdf` | Super Admin, Application Officer, Viewer |
| PATCH | `/applications/:id/status` | Super Admin, Application Officer |
| POST | `/applications/:id/notes` | Super Admin, Application Officer |
| GET | `/payments` | Super Admin, Finance Officer |
| GET | `/reports/summary`, `/reports/applications.csv` | Super Admin, Application Officer, Viewer |
| GET | `/reports/payments.csv` | Super Admin, Finance Officer |
| GET/PATCH | `/settings` | Super Admin |
| POST | `/settings/test-email` | Super Admin |
| POST/DELETE | `/settings/logo` | Super Admin |
| POST | `/settings/hero-images` | Super Admin |
| DELETE | `/settings/hero-images` | Super Admin |
| GET/POST/PATCH | `/users`, `/users/:id` | Super Admin |

---

## Security

- **JWT** in an httpOnly cookie (also accepted as bearer token); configurable expiry; passwords
  hashed with bcrypt (cost 12); deactivated admins cannot log in.
- **Role-based access control** enforced server-side on every admin route.
- **Draft access tokens**: each public draft gets a random 256-bit token; only its SHA-256 hash is
  stored, and every draft read/write/upload/payment must present it. Knowing an application ID is
  not enough to read someone else's draft.
- **Documents are never publicly served.** Only `uploads/public/` (logo and hero images) is
  exposed statically; applicant/sponsor files are streamed through authenticated admin routes.
- **Uploads**: MIME allow-list (JPG/PNG; WEBP for branding images), size limits, UUID filenames —
  the client's filename is never used on disk.
- **Rate limiting**: global API limiter plus stricter limits on login, payment initiation, draft
  creation and status checks.
- **Hardening**: Helmet, CORS locked to `CLIENT_URL`, `express-mongo-sanitize`, request-body size
  limits, `express-validator` on inputs, `trust proxy` for deployment behind TLS; CSV exports
  neutralise spreadsheet formula injection.
- **Secrets** (`MONGODB_URI`, `JWT_SECRET`, `MPESA_*`) live only in server env vars and are never
  returned to the frontend. The SMTP password entered in Settings is stored encrypted and is
  write-only through the API. The Settings API exposes only non-secret M-Pesa status flags.
- **Callback integrity**: Safaricom does not sign callbacks, so state changes are only accepted for
  a `CheckoutRequestID` the server issued itself, the paid amount must match the amount requested,
  and the status-query fallback independently confirms results with Daraja.

---

## Setup & Running

### Environment variables

`backend/.env` (copy from `.env.example`):

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT`, `CLIENT_URL` | Runtime mode, API port (5000), allowed frontend origin (CORS/cookies) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_COOKIE_NAME` | Admin auth |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` |
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET` | Daraja app credentials |
| `MPESA_SHORTCODE`, `MPESA_PASSKEY` | Paybill/till and STK passkey |
| `MPESA_CALLBACK_URL` | Public HTTPS URL of `/api/payments/mpesa/callback` |
| `MPESA_TRANSACTION_TYPE` | `CustomerPayBillOnline` or `CustomerBuyGoodsOnline` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Fallback outgoing mail for admin notifications, used when no SMTP server is set in Admin → Settings (optional) |
| `UPLOAD_DIR`, `MAX_FILE_SIZE_MB` | Upload location and per-file size cap |
| `RATE_LIMIT_WINDOW_MINUTES`, `RATE_LIMIT_MAX_REQUESTS` | Global rate limit |
| `SEED_SUPER_ADMIN_*` | Used by bootstrap scripts only |

`frontend/.env`: `VITE_API_BASE_URL` (default `http://localhost:5000/api`).

### Scripts

| Location | Command | Description |
|---|---|---|
| backend | `npm run dev` | Start with nodemon (auto-reload) |
| backend | `npm start` | Start in production |
| backend | `npm test` | Unit + HTTP smoke tests (no database needed) |
| backend | `npm run create-admin -- --email=… --password=… --name="…"` | Create or promote a Super Admin |
| backend | `npm run seed-settings` | Seed the default settings document |
| frontend | `npm run dev` | Vite dev server (port 5173) |
| frontend | `npm run build` | Type-check and build to `dist/` |
| frontend | `npm run preview` | Preview the production build |
| frontend | `npm run lint` | ESLint |

### 1. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure MongoDB

Run MongoDB locally (`mongodb://localhost:27017`) or use a hosted cluster (e.g. MongoDB Atlas).
Copy the connection string — you'll put it in `MONGODB_URI` in step 4.

### 3. Configure M-Pesa Daraja

1. Create an app at the [Safaricom Daraja Portal](https://developer.safaricom.co.ke/).
2. For sandbox testing, use the default test shortcode `174379` and the sandbox passkey
   published in the Daraja docs.
3. For production, get your paybill/till shortcode, consumer key/secret and passkey from
   Safaricom after go-live approval.
4. Your `MPESA_CALLBACK_URL` **must be a publicly reachable HTTPS URL** (Safaricom cannot call
   `localhost`). For local development, use a tunnel such as `ngrok http 5000` and set
   `MPESA_CALLBACK_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api/payments/mpesa/callback`.

### 4. Configure Environment Variables

```bash
cd backend
cp .env.example .env
# edit .env with your MongoDB URI, JWT secret, and M-Pesa credentials

cd ../frontend
cp .env.example .env
# defaults to http://localhost:5000/api — edit if your API runs elsewhere
```

Never commit `.env` files. `MONGODB_URI`, `JWT_SECRET`, and all `MPESA_*` secrets stay
server-side only and are never sent to the frontend.

### 4b. Configure Email Notifications (optional)

The portal owner can set everything up from **Admin → Settings → Email notifications** — no
server access needed:

1. Enter the mail server (SMTP) details from your email provider: host, port, SSL on/off,
   username, password and "From" address. For Gmail use `smtp.gmail.com`, port `465`, SSL on,
   your Gmail address and an [app password](https://myaccount.google.com/apppasswords).
2. Enter the notification recipients (or leave blank to email all active Super Admins and
   Application Officers) and choose which events send email.
3. Click **Save settings**, then **Send test email**.

The SMTP password is encrypted in the database (AES-256-GCM, key derived from `JWT_SECRET`) and is
never sent back to the browser; leave the field blank to keep the saved one. If you rotate
`JWT_SECRET`, re-enter the SMTP password.

Alternatively, set the `SMTP_*` and `EMAIL_FROM` variables in `backend/.env`; they are used when
the SMTP host in Settings is left blank. `CLIENT_URL` is used for the "Open in admin dashboard"
link in each email.

### 5. Start the Backend

```bash
cd backend
npm run dev      # nodemon, auto-reload
# or
npm start        # production
```

The API runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

### 6. Start the Frontend

```bash
cd frontend
npm run dev
```

The portal runs on `http://localhost:5173` by default.

### 7. Create the First Admin

```bash
cd backend
npm run create-admin -- --email=admin@yourdomain.com --password=StrongPass123 --name="Jane Admin"
```

This creates (or promotes an existing account to) a `SUPER_ADMIN`. Log in at
`http://localhost:5173/admin/login`. From Admin → Settings you can then set the agency name,
logo, contact details, and application fee. From Admin → Admin Users you can create
`APPLICATION_OFFICER`, `FINANCE_OFFICER`, and `VIEWER` accounts.

### 8. Test an Application

1. Go to `http://localhost:5173` → **Start Application**.
2. Fill in Applicant → Family → Refugee/Manifest → Sponsor → Documents → Review.
3. On the Review step, tick both confirmation checkboxes and continue to Payment.

### 9. Test M-Pesa Payment

- **Sandbox**: use one of Safaricom's published test MSISDNs (e.g. `254708374149`) with the
  sandbox shortcode/passkey. Approve the prompt in the Safaricom test simulator (sandbox does
  not push to a real phone) or use the Daraja simulator to send a callback.
- Watch the backend logs for `[mpesa]` entries and confirm the `Payment` document transitions
  from `PENDING` to `PAID` once the callback (or the active status-query fallback) resolves.
- The application only becomes `SUBMITTED` after a **verified** Daraja callback/query result —
  never merely because the STK request was accepted.

---

## Deploy to Production

- Set `NODE_ENV=production` and provide real values for every variable in `backend/.env.example`.
- Put the backend behind HTTPS (e.g. Nginx/Caddy reverse proxy or a platform that terminates
  TLS for you) — `app.set('trust proxy', 1)` is already configured for this.
- Point `MPESA_CALLBACK_URL` at your real HTTPS domain and set `MPESA_ENVIRONMENT=production`
  with your live Daraja credentials.
- Set `CLIENT_URL` to your deployed frontend origin (used for CORS + cookie settings).
- Build the frontend: `cd frontend && npm run build`, then serve the `dist/` folder via your
  static host or CDN, with `VITE_API_BASE_URL` pointing at your production API. Configure the
  host to fall back to `index.html` for client-side routes (`/apply`, `/admin/...`).
- Run `npm run create-admin` once against production to bootstrap the first Super Admin.
- Persist the `backend/uploads/` directory (volume or object storage) and back it up with the database.
- Consider adding a process manager (PM2/systemd) and log rotation for the backend.

---

## Key Business Rules

- **Payment before submission**: `Application.status` only moves from `AWAITING_PAYMENT` to
  `SUBMITTED` after a Daraja callback (or the active-query fallback) confirms `ResultCode: 0`.
  A failed/cancelled payment leaves the application in `AWAITING_PAYMENT` so the client can
  retry without creating a duplicate application.
- **Multi-step drafts**: schema-level `required` is intentionally relaxed on applicant/sponsor/
  family fields (see comments in `backend/src/models/Application.js`) because the form saves
  incrementally. Completeness is enforced explicitly in
  `backend/src/utils/applicationCompleteness.js` before payment is allowed.
- **Documents are never publicly served**: there is no static file route for applicant uploads. All
  document access goes through authenticated admin routes
  (`GET /api/admin/applications/:id/documents/:type`).
- **Application numbers** (`APP-2026-000001`) are generated atomically via a `Counter`
  collection, safe under concurrent requests. They are assigned at the review step, so abandoned
  drafts don't consume numbers. The prefix is configurable in Settings.
- **Fee snapshot**: the fee is captured at review time (`applicationFeeAtSubmission`) and rounded
  once, so the amount shown, stored and charged are always identical.
- **Status check** requires both the application number and the sponsor's phone number on file.
- **Admin status changes**: only paid applications can be moved through the review statuses;
  unpaid ones can only be cancelled. Admins cannot change their own role or deactivate themselves,
  and the last active Super Admin cannot be demoted or deactivated.

## Admin Roles

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Everything, including Settings and Admin Users |
| `APPLICATION_OFFICER` | View/update applications and statuses, add notes |
| `FINANCE_OFFICER` | View payments and payment reports |
| `VIEWER` | Read-only application access |
