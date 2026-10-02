# SmartInventory & Billing — MERN

A complete MERN inventory and billing application for a small retail shop. The project has been cleaned up to remove bundled dependencies, repair unsafe billing logic, and add practical POS/inventory workflows.

## Included features

### Authentication
- Register with email or phone identifier.
- JWT authentication with session validation.
- Password login and demo OTP login.
- Admin/cashier role support in the data model.
- Protected admin-only destructive actions.

### Inventory
- Product CRUD with archive instead of hard delete.
- SKU and barcode fields.
- Category and unit management.
- Cost price, selling price and tax percentage.
- Stock quantities and low-stock thresholds.
- Manual stock adjustment.
- Search and category filtering.

### Billing / POS
- Fast product search.
- Cart quantity controls with stock limits.
- Server-side price/tax/total calculation (client totals are not trusted).
- Cash, UPI, Card and Credit payment modes.
- Optional customer name, phone and notes.
- Automatic stock deduction with rollback if sale creation fails.
- PDF invoice download.
- Optional WhatsApp click-to-chat invoice sharing.

### Sales
- Search sales by invoice, customer or phone.
- Filter by payment method.
- View invoice details.
- PDF invoice export.
- Admin-only sale cancellation with stock restoration.

### Dashboard
- Revenue, order count, product count, units in stock.
- Inventory value.
- Low-stock alerts.
- Payment-method revenue chart.
- Recent sales.

## Run locally

### 1. Requirements
- Node.js 18+
- MongoDB (local or MongoDB Atlas)

### 2. Backend

```bash
cd backend
npm install
# adjust backend/.env for your MongoDB connection
npm run seed
npm run dev
```

Demo account created by `npm run seed`:

```text
Email: admin@shop.local
Password: Admin@123
```

Change this password before any real deployment.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend expects:

```text
VITE_API_URL=http://localhost:5000/api
```

## Environment variables

Copy the example files before deployment:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set a strong `JWT_SECRET`, use your MongoDB connection string, and set `DEMO_OTP_ENABLED=false` once a real SMS/email OTP provider is integrated.

## API summary

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create admin account |
| POST | `/api/auth/login` | Password or OTP login |
| POST | `/api/auth/send-otp` | Generate OTP |
| GET | `/api/auth/me` | Validate session |
| PUT | `/api/auth/update-profile` | Update profile/password |
| GET | `/api/inventory` | Search/list products |
| POST | `/api/inventory` | Add product |
| PUT | `/api/inventory/:id` | Update product |
| PATCH | `/api/inventory/:id/stock` | Adjust stock |
| DELETE | `/api/inventory/:id` | Admin archive product |
| POST | `/api/sales` | Create sale and deduct stock |
| GET | `/api/sales` | Sales history |
| GET | `/api/sales/:id` | Invoice details |
| DELETE | `/api/sales/:id` | Admin cancel sale + restore stock |
| GET | `/api/sales/dashboard-stats` | Dashboard metrics |

## Important fixes made

- Removed hard-coded `localhost:5000` URLs from React and moved API configuration to Vite env vars.
- Removed the forced Google DNS override from the server.
- Removed bundled `node_modules` from the deliverable.
- Added root and per-app `.gitignore`/`.env.example` files.
- Stopped trusting client-submitted subtotal/tax/total values.
- Added stock validation and atomic per-item decrements.
- Added rollback if a sale cannot be persisted.
- Sale cancellation now restores stock.
- Destructive actions require admin role.
- Products are archived rather than physically deleted.
- Added session validation on app startup.
- Added PDF invoice generation.
- Added seed data and a repeatable setup path.

## Production checklist

Use MongoDB Atlas or a properly configured replica set, set a strong random JWT secret, use HTTPS, disable demo OTP, integrate a real OTP provider, and configure your deployment's allowed frontend origin.
