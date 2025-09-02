# Mwanzo Flats Management System

> Modern tenant management and billing platform for Mwanzo Flats property.

---

## 🚀 Overview

Mwanzo Flats Management System is a full-featured, modern web application for managing tenants, utility billing cycles, and payments. It empowers property managers with a beautiful admin dashboard and gives tenants a secure portal to view bills, payment history, and their profile—all powered by Supabase and React.

---

## ✨ Features

### Admin Dashboard
- **Tenants:** Add, update, search, and manage tenants. Invite tenants to self-serve via the portal.
- **Billing:** Create monthly bills, track meter readings, rates, and balances. Prevent duplicate cycles.
- **Payments:** Record and view payments, see outstanding balances, and export data.
- **Communications:** (Optional) Log and send email/SMS notifications for bills and reminders.
- **Theme:** Light/dark mode with consistent, accessible design tokens.

### Tenant Portal
- **Overview:** Friendly welcome, current bill, and quick stats.
- **Bills:** List of all bills, balances, and due dates.
- **Payments:** Payment history and receipts.
- **Profile:** View (and optionally edit) contact and unit info.

---

## 🏗️ How It Works

- **Authentication:** Supabase Auth (email magic link, confirm signup, etc.)
- **Data Model:**
	- `tenants`: Tenant info, unit, meter, and optional link to auth user.
	- `billing_cycles`: Monthly bills per tenant (readings, rates, balances).
	- `payments`: Payments toward bills (auto-syncs with billing).
	- `profiles`: User profile extension (optional).
	- `communication_logs`: Email/SMS event log (optional).
- **Business Logic:**
	- One bill per tenant per month/year (unique).
	- Payments must be positive.
	- Balances and paid totals are computed in the database (not the client).
- **Access Control:**
	- Admins: Full CRUD via dashboard (service role or admin RLS).
	- Tenants: Can only see their own data (RLS: tenants.user_id = auth.uid()).

---

## 🖥️ Tech Stack

- **Frontend:** React + TypeScript, Tailwind CSS (dark mode: class)
- **Backend:** Supabase (Postgres, Auth, RLS)
- **Tooling:** Supabase CLI (migrations), MCP Supabase server for local tooling

---

## 🛠️ Getting Started

**Prerequisites:**
- Node.js 18+
- Supabase project (get your project ref and anon key)

**Setup:**
1. Clone the repo
2. Create `.env.local` with:
	 ```
	 VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
	 VITE_SUPABASE_ANON_KEY=<your-anon-key>
	 ```
3. Install dependencies:
	 ```
	 npm install
	 ```
4. Start the dev server:
	 ```
	 npm run dev
	 ```
5. Open the app at the printed local URL (e.g., http://localhost:5173)

---

## 🗄️ Database Model (Summary)

- **tenants**: id, name, phone, email, house_unit_number, meter_connection_number (unique), status, user_id (nullable, FK to auth.users)
- **billing_cycles**: tenant_id (FK), month, year, readings, rate, previous/current balance, paid_amount (auto), current_balance (auto)
- **payments**: tenant_id (FK), billing_cycle_id (FK), amount (>0), payment_date, method, notes
- **RLS**: Tenants can only see their own data; admins have full access

---

## 📝 Typical Workflows

### Admin
- Add a tenant (no user_id at creation)
- Invite tenant (creates auth user, links user_id)
- Create a bill (unique per tenant/month/year)
- Record a payment (auto-updates balances)

### Tenant
- Log in to portal
- View overview, bills, payments, and profile

---

## 🎨 Theming & Accessibility

- Uses Tailwind CSS with design tokens: `bg-background`, `text-foreground`, etc.
- Fully responsive and accessible (keyboard, screen reader friendly)
- Light/dark mode toggle for all users

---

## 🚢 Deployment

- Deploy frontend to Vercel/Netlify/Render
- Set environment variables for Supabase URL and anon key
- Configure Supabase Auth (site URL, email templates, sender domain)
- Enable backups and RLS in Supabase

---

## 🧩 Extending

- Add payment integrations (M-Pesa, Stripe, etc.)
- Add PDF receipt generation
- Add notifications (email/SMS) for due bills
- Add audit logs for admin actions

---

## 📄 License

Proprietary. All rights reserved.
