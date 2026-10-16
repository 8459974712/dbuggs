# DBUGG Platform

B2B/B2C laptop trading and management platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS (Node.js, TypeScript) |
| **Frontend (Admin)** | HTML, CSS, JavaScript |
| **Frontend (Web)** | HTML, CSS, JavaScript |
| **Database** | PostgreSQL 16 |
| **Containerization** | Docker & Docker Compose |
| **Monorepo** | Turborepo |

## Database

- **Type:** PostgreSQL 16 (Alpine)
- **Container:** `dbugg-postgres`
- **Tables:** users, orders, laptops, dealers, payments, rentals, commissions, audit_logs, b2b_buyers, kyc_documents, laptop_qc, role_permissions

## Project Structure

```
apps/
  api/        → NestJS backend API (port 4000)
  admin/      → Admin dashboard (port 5000)
  web/        → Customer website (port 5001)
packages/
  shared/     → Shared constants & utilities
database/
  dbugg-backup.sql → PostgreSQL database backup
```

## Running

```bash
docker-compose up -d --build
```
