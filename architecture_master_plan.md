# Supermarket POS & Management System — Master Architecture Plan

> **Document Version:** 1.0  
> **Date:** 2026-10-05  
> **Status:** AWAITING APPROVAL — No implementation code until approved.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Final Architecture](#2-final-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Local SQLite Architecture](#4-local-sqlite-architecture)
5. [Central PostgreSQL Architecture](#5-central-postgresql-architecture)
6. [Multi-Company Architecture](#6-multi-company-architecture)
7. [Multi-Branch Architecture](#7-multi-branch-architecture)
8. [POS Architecture](#8-pos-architecture)
9. [Offline Architecture](#9-offline-architecture)
10. [Sync Architecture](#10-sync-architecture)
11. [Conflict Resolution](#11-conflict-resolution)
12. [Authentication](#12-authentication)
13. [RBAC](#13-rbac)
14. [Database ERD](#14-database-erd)
15. [API Architecture](#15-api-architecture)
16. [Electron Architecture](#16-electron-architecture)
17. [Admin Dashboard](#17-admin-dashboard)
18. [POS Features](#18-pos-features)
19. [Folder Structure](#19-folder-structure)
20. [Development Phases](#20-development-phases)
21. [MVP Definition](#21-mvp-definition)
22. [Risks](#22-risks)
23. [Testing Strategy](#23-testing-strategy)
24. [Production Deployment](#24-production-deployment)

---

## 1. Executive Summary

This system is a **production-grade, offline-first, multi-company, multi-branch Supermarket Point-of-Sale and Management Platform**. It is architected around two core principles:

1. **Local-first**: Every POS terminal writes to a local SQLite database first. A sale is *complete* the instant it is committed to SQLite. Internet connectivity is an enhancement that enables centralized reporting, cross-branch management, and data backup — never a prerequisite for selling.

2. **Multi-tenant isolation**: The platform hosts multiple independent companies, each with multiple branches, each with multiple POS terminals. Data isolation between companies is absolute; branch-level isolation is enforced through scoped queries and RBAC.

### What the system provides

| Capability | Description |
|---|---|
| **POS Terminal** | Fast barcode-scan → cart → pay → receipt workflow running on Electron + SQLite |
| **Local Admin** | In-app management of products, inventory, cashiers, shifts, expenses, reports, backups — fully offline-capable |
| **Cloud Admin Dashboard** | Web-based centralized management of companies, branches, users, products, inventory, sales, reports, sync, audit |
| **Sync Engine** | Dedicated bidirectional synchronization layer with idempotency, retry, conflict detection, and duplicate protection |
| **Hardware Integration** | Abstracted interfaces for barcode scanners, thermal printers, and cash drawers |
| **Security** | JWT + refresh tokens, offline authentication via cached password verifiers, RBAC with granular permissions, Electron hardening, encrypted sensitive local data |
| **Internationalization** | Arabic (RTL) and English (LTR) with externalized translation files |

### Architecture in one diagram

```
                         PLATFORM
                            │
                   ┌────────┴────────┐
                   │                 │
              COMPANY A          COMPANY B
                   │
         ┌─────────┼─────────┐
         │         │         │
      Branch 1  Branch 2  Branch 3
         │
    ┌────┼────┐
    │    │    │
  POS-1 POS-2 POS-3        ← Electron + React + SQLite
    │
  SQLite (local truth)
    │
  Sync Engine ────────────→ Node.js/NestJS Backend
                                     │
                                PostgreSQL (central truth)
                                     │
                                Cloud Admin Dashboard
```

### Key design decisions

- **Money representation**: All monetary values stored as integers in the smallest currency unit (e.g., piasters for EGP — 1 EGP = 100 piasters). This eliminates floating-point errors.
- **Distributed IDs**: Every locally-created entity uses a **ULID** (Universally Unique Lexicographically Sortable Identifier). ULIDs are time-ordered, globally unique, and safe for offline creation on multiple terminals.
- **Idempotency**: Every sync operation carries an idempotency key. The server uses unique constraints on these keys to guarantee that retried uploads never create duplicates.
- **Conflict strategy**: Not "last write wins" universally. Sales are append-only (no conflict). Inventory uses **additive reconciliation** (each terminal's movements are summed, never overwritten). Product metadata uses server-authority with admin notification.

---

## 2. Final Architecture

### System-Level Architecture

```mermaid
graph TB
    subgraph "POS Terminal (Electron)"
        Renderer["React Renderer<br/>(POS + Local Admin)"]
        Preload["Preload Scripts<br/>(Secure IPC Bridge)"]
        Main["Electron Main Process"]
        SQLite["SQLite Database"]
        SyncEng["Sync Engine"]
        HW["Hardware Services<br/>(Printer / Scanner / Drawer)"]
        
        Renderer <-->|"IPC (typed channels)"| Preload
        Preload <-->|"IPC"| Main
        Main <--> SQLite
        Main <--> SyncEng
        Main <--> HW
    end
    
    subgraph "Cloud Infrastructure"
        Nginx["Nginx<br/>(Reverse Proxy + TLS)"]
        API["NestJS + Fastify<br/>(REST API + WebSocket)"]
        PG["PostgreSQL"]
        Redis["Redis<br/>(Sessions, Rate Limiting)"]
        
        Nginx --> API
        API <--> PG
        API <--> Redis
    end
    
    subgraph "Cloud Admin"
        WebAdmin["React Web Dashboard"]
        WebAdmin --> Nginx
    end
    
    SyncEng <-->|"HTTPS REST + WebSocket"| Nginx
```

### Data Flow Layers (Desktop)

```
┌─────────────────────────────────────────────┐
│  UI Layer (React Components)                │
├─────────────────────────────────────────────┤
│  Application Layer (Zustand Stores + Hooks) │
├─────────────────────────────────────────────┤
│  Domain Layer (Business Logic Services)     │
├─────────────────────────────────────────────┤
│  Repository Layer (Data Access)             │
├─────────────────────────────────────────────┤
│  IPC Bridge (Preload ↔ Main)                │
├─────────────────────────────────────────────┤
│  Database Layer (Drizzle + SQLite)          │
└─────────────────────────────────────────────┘
```

### Data Flow Layers (Cloud Backend)

```
┌─────────────────────────────────────────────┐
│  API Layer (NestJS Controllers + Guards)    │
├─────────────────────────────────────────────┤
│  Service Layer (Business Logic)             │
├─────────────────────────────────────────────┤
│  Repository Layer (Data Access)             │
├─────────────────────────────────────────────┤
│  Database Layer (Drizzle + PostgreSQL)      │
└─────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Desktop Shell** | Electron | Cross-platform desktop runtime; access to filesystem, hardware, SQLite, native menus, auto-update |
| **UI Framework** | React 18+ | Component-based, massive ecosystem, fast rendering with concurrent features |
| **Language** | TypeScript | Type safety across entire codebase (renderer, main, backend, shared types) |
| **Styling** | Tailwind CSS | Utility-first; fast iteration, consistent design tokens, RTL support via `dir` attribute |
| **Client State** | Zustand | Lightweight, no boilerplate, excellent TypeScript support, works perfectly with React |
| **Server State** | TanStack Query | Caching, deduplication, background refetch, offline-aware query management |
| **Local Database** | SQLite (via `better-sqlite3`) | Zero-config embedded database; synchronous API ideal for Electron main process; ACID transactions; no network dependency |
| **Local ORM** | Drizzle ORM | Type-safe schema definitions, lightweight, supports SQLite and PostgreSQL with the same API surface, excellent migration support |
| **Backend Framework** | NestJS on Fastify | Modular architecture, dependency injection, guards/interceptors for auth/RBAC, Fastify for superior throughput vs Express |
| **Central Database** | PostgreSQL 15+ | ACID, MVCC, row-level security, JSON support, full-text search, mature replication, excellent for multi-tenant |
| **API** | REST | Simple, cacheable, well-understood; sufficient for sync operations and CRUD |
| **Realtime** | WebSocket (via `@nestjs/websockets`) | Push notifications for inventory alerts, terminal status, sync events — non-critical path |
| **Auth** | JWT + Refresh Tokens | Stateless verification, works offline once issued, refresh flow for long sessions |
| **Packaging** | Electron Builder | Mature, supports Windows/macOS/Linux, auto-update, code signing |
| **Containerization** | Docker + Docker Compose | Reproducible deployments, environment parity |
| **Reverse Proxy** | Nginx | TLS termination, rate limiting, static file serving, WebSocket proxying |
| **Cache/Sessions** | Redis | Rate limiting, refresh token blacklist, pub/sub for WebSocket scaling |
| **Testing** | Vitest + Playwright + Supertest | Vitest for unit/integration (fast, TypeScript-native), Playwright for E2E, Supertest for API testing |

### Why SQLite + PostgreSQL (Dual Database)

| Concern | SQLite (Local) | PostgreSQL (Central) |
|---|---|---|
| Internet dependency | None | Required |
| Latency | Sub-millisecond | Network-dependent |
| Concurrency | Single-writer (fine for single POS) | Multi-writer, MVCC |
| Multi-tenant | N/A (one tenant per device) | Row-level, schema-level isolation |
| Reporting | Local reports only | Cross-branch aggregation |
| Backup | Simple file copy | pg_dump, WAL archival |
| Scalability | Single device | Horizontal read replicas |

The dual-database design means: **a POS terminal never waits for the network to complete a sale**. SQLite is the operational source of truth at the terminal. PostgreSQL is the global source of truth for management.

---

## 4. Local SQLite Architecture

### Purpose

The local SQLite database stores everything a single POS terminal (or branch) needs to operate independently:

- **Identity**: Which company, branch, and terminal this device belongs to
- **Authentication**: Cached password verifiers so cashiers can log in offline
- **Catalog**: Products, categories, brands, units, barcodes, prices, taxes
- **Operations**: Sales, sale items, payments, refunds, cash sessions, expenses
- **Inventory**: Current stock levels, movements
- **Customers**: Local customer records
- **Sync**: Queue of pending operations, sync logs, checkpoints
- **Configuration**: POS settings, receipt templates, locale preferences

### Key Design Principles

1. **Branch-scoped data**: A device only stores data relevant to its branch (and potentially a subset of global data like products).
2. **ULIDs everywhere**: Primary keys are ULIDs (stored as TEXT in SQLite). No auto-increment for business entities.
3. **Money as integers**: All monetary columns are INTEGER representing the smallest currency unit.
4. **Timestamps as ISO 8601 TEXT**: SQLite lacks a native datetime; ISO 8601 strings sort correctly and are human-readable.
5. **Soft deletes**: Entities use `deleted_at` rather than physical deletion to support sync.
6. **Version tracking**: Each syncable row has a `version` (integer, incremented on update) and `updated_at` for change detection.

### Local SQLite Tables (Summary)

```
IDENTITY & CONFIG
  local_device            — device registration, company/branch binding
  local_settings          — key/value config (receipt template, locale, tax mode, etc.)

AUTH (cached)
  local_users             — user profiles + password hash + permissions blob
  local_sessions          — active login sessions with expiry

CATALOG
  products                — full product records
  product_barcodes        — multiple barcodes per product
  categories              — nested categories (parent_id)
  brands
  units                   — kg, piece, liter, etc.
  product_prices          — price tiers (retail, wholesale, promo) with effective dates
  tax_rates               — configurable tax rates

OPERATIONS
  sales                   — sale header (terminal, cashier, customer, totals, status)
  sale_items              — line items (product, qty, price, discount, tax, subtotal)
  payments                — payment records (method, amount, reference)
  refunds                 — refund header referencing original sale
  refund_items            — refund line items
  held_carts              — parked/held orders

CASH MANAGEMENT
  cash_sessions           — shift open/close records
  cash_movements          — deposits, withdrawals, expenses during a session

INVENTORY
  inventory               — current stock per product (at this branch)
  inventory_movements     — stock change log (sale, purchase, adjustment, transfer, damage)

CUSTOMERS
  customers               — name, phone, email, loyalty info

EXPENSES
  expenses                — branch expenses with category

SYNC
  sync_queue              — pending operations to upload
  sync_log                — history of sync attempts
  sync_checkpoints        — last sync timestamp per entity type (for delta downloads)

AUDIT
  audit_log               — local audit trail (append-only)

BACKUP
  backup_metadata         — local backup history
```

---

## 5. Central PostgreSQL Architecture

### Purpose

PostgreSQL is the **global source of truth** for the entire platform. It stores:

- All companies and their configurations
- All branches and terminal registrations
- All users, roles, and permissions (authoritative)
- Aggregated sales, inventory, and financial data from all terminals
- Supplier and purchase management
- Cross-branch reports
- Sync records and conflict logs
- Complete audit trail

### Key Design Principles

1. **Company isolation via `company_id`**: Every tenant-scoped table includes a `company_id` column. Composite indexes and application-level guards ensure Company A never sees Company B's data.
2. **ULIDs as primary keys**: Same ULID strategy as SQLite. IDs created on terminals are directly inserted into PostgreSQL without remapping.
3. **Money as BIGINT**: Stored in smallest currency unit (piasters). The `numeric` type is used only for complex financial calculations at the reporting layer.
4. **Timestamps as `TIMESTAMPTZ`**: PostgreSQL's native timezone-aware timestamp type.
5. **Soft deletes**: `deleted_at TIMESTAMPTZ` for syncable entities.
6. **Row versioning**: `version INTEGER` column incremented on every update; used by sync engine for optimistic concurrency.

### PostgreSQL Tables (Summary)

```
PLATFORM
  companies               — tenant records
  company_settings        — per-company configuration

BRANCH & DEVICE
  branches                — physical store locations
  branch_settings         — per-branch configuration
  devices                 — registered Electron installations
  pos_terminals           — logical terminal identities

USERS & RBAC
  users                   — all user accounts (hashed passwords)
  roles                   — system + custom roles
  permissions             — granular permission definitions
  role_permissions        — role ↔ permission mapping
  user_roles              — user ↔ role mapping
  user_branches           — user ↔ branch access mapping

CATALOG
  products                — master product records
  product_barcodes        — multiple barcodes per product
  categories              — hierarchical categories
  brands
  units
  product_prices          — price tiers with date ranges & branch overrides
  tax_rates               — tax configurations

INVENTORY
  branch_inventory        — stock per product per branch
  inventory_movements     — every stock change with reason & reference
  stock_transfers         — inter-branch transfer records
  stock_transfer_items    — transfer line items

PURCHASING
  suppliers
  purchase_orders         — PO headers
  purchase_order_items    — PO line items
  supplier_payments       — payment records for suppliers

CUSTOMERS
  customers               — customer records scoped by company

SALES
  sales                   — all sales from all terminals
  sale_items              — line items
  payments                — payment records
  refunds                 — refund headers
  refund_items            — refund line items

CASH MANAGEMENT
  cash_sessions           — shift records
  cash_movements          — cash in/out during sessions

EXPENSES
  expenses                — branch expenses
  expense_categories      — expense categorization

SYNC
  sync_operations         — received sync operations (with idempotency keys)
  sync_logs               — sync history per device
  sync_conflicts          — detected conflicts requiring resolution

AUDIT
  audit_logs              — platform-wide audit trail (append-only, partitioned by month)

NOTIFICATIONS
  notifications           — admin notifications (low stock, sync failures, etc.)

REPORTS (materialized/aggregated)
  daily_sales_summary     — pre-aggregated daily sales by branch
  product_sales_summary   — pre-aggregated product performance
```

---

## 6. Multi-Company Architecture

### Isolation Model: **Shared Database, Discriminator Column**

All companies share the same PostgreSQL database but are isolated by a `company_id` discriminator column on every tenant-scoped table.

```
┌──────────────────────────────────────────┐
│  PostgreSQL Database                     │
│                                          │
│  ┌─────────────┐  ┌─────────────┐       │
│  │ company_id  │  │ company_id  │       │
│  │    = A      │  │    = B      │       │
│  │             │  │             │       │
│  │ Products    │  │ Products    │       │
│  │ Sales       │  │ Sales       │       │
│  │ Users       │  │ Users       │       │
│  │ Inventory   │  │ Inventory   │       │
│  └─────────────┘  └─────────────┘       │
│       ▲                 ▲                │
│       │  NEVER CROSS    │                │
│       └────────X────────┘                │
└──────────────────────────────────────────┘
```

### Enforcement layers

1. **Database**: Composite unique indexes include `company_id` (e.g., `UNIQUE(company_id, barcode)`).
2. **Backend**: A NestJS `CompanyGuard` injects the authenticated user's `company_id` into every repository query. No query can omit the company scope.
3. **API**: All tenant-scoped endpoints require a valid JWT whose claims include `company_id`. The guard verifies the requested resource belongs to the user's company.
4. **Local (Electron)**: The SQLite database inherently belongs to one company. The `local_device` table records the bound `company_id`. The app refuses to import data from a different company.

### Why not schema-per-company or database-per-company?

- **Schema-per-company**: Good isolation but complicates migrations (must run on N schemas) and cross-company platform reporting.
- **Database-per-company**: Best isolation but high operational overhead (connection pooling, backups, migrations per DB).
- **Shared with discriminator**: Simplest operationally, proven at scale (Shopify, Basecamp), and sufficient when combined with application-level guards. If a customer requires stronger isolation in the future, migrating to schema-per-company is a non-breaking change.

---

## 7. Multi-Branch Architecture

### Structure

```
Company (Ahmed Supermarkets)
├── Branch: Alexandria
│   ├── POS-ALEX-01
│   ├── POS-ALEX-02
│   └── POS-ALEX-03
├── Branch: Smouha
│   ├── POS-SMOU-01
│   └── POS-SMOU-02
└── Branch: Miami
    └── POS-MIAM-01
```

### Branch-level scoping

| Entity | Scoping |
|---|---|
| Products | Company-level (shared catalog), with optional branch-specific pricing |
| Inventory | **Branch-level** — each branch has independent stock |
| Sales | Branch-level (created at a specific branch/terminal) |
| Cashiers | Assigned to specific branch(es) |
| Expenses | Branch-level |
| Cash Sessions | Branch + Terminal level |
| Customers | Company-level (shared across branches) |
| Suppliers | Company-level |

### Admin Dashboard: Branch Selector

Every relevant page in the Cloud Admin Dashboard includes a **global branch selector**:

```
┌──────────────────────────────────┐
│  Company: Ahmed Supermarkets     │
│  Branch: [ All Branches ▼ ]     │
│    ○ All Branches                │
│    ○ Alexandria                  │
│    ○ Smouha                      │
│    ○ Miami                       │
└──────────────────────────────────┘
```

- Selection is persisted in the user's session
- All data queries on that page are filtered by the selected branch(es)
- Users only see branches they are authorized to access (via `user_branches` mapping)

### Inter-branch operations

- **Stock transfers**: Formalized workflow (Request → Approve → Ship → Receive → Complete)
- **Product catalog**: Managed centrally, synced down to branches
- **Reporting**: Aggregatable across all branches or filterable to one

---

## 8. POS Architecture

### Cashier Workflow

```
┌─────────────────────────────────────────────────────┐
│                    POS SCREEN                       │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  🔍 Barcode / Search: [__________________] │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │   PRODUCT RESULTS   │  │       CART           │  │
│  │                     │  │                      │  │
│  │  Coca Cola 330ml    │  │  Coca Cola   x2  20 │  │
│  │  Pepsi 330ml        │  │  Chips       x1  15 │  │
│  │  7Up 330ml          │  │  Bread       x3  30 │  │
│  │                     │  │                      │  │
│  │                     │  │  ──────────────────  │  │
│  │                     │  │  Subtotal:       65  │  │
│  │                     │  │  Discount:       -5  │  │
│  │                     │  │  Tax:            +9  │  │
│  │                     │  │  ════════════════════ │  │
│  │                     │  │  TOTAL:          69  │  │
│  └─────────────────────┘  └─────────────────────┘  │
│                                                     │
│  [Hold] [Clear] [Customer] [Discount] [Pay ▶]     │
│  [Shift: Open] [Sync: ✓] [Offline: ✗]             │
└─────────────────────────────────────────────────────┘
```

### Sale Lifecycle

```
IDLE ──→ SCANNING ──→ CART_BUILDING ──→ PAYMENT ──→ COMPLETED
                ↑            │                          │
                │            ▼                          ▼
                │         HELD ──→ RESUMED           RECEIPT
                │                                    PRINTED
                └────── CLEARED (cart discarded)
```

### Sale Data Flow (always local-first)

```
Cashier Action (scan / search / add)
         │
         ▼
React Component → Zustand Store (cart state)
         │
         ▼
"Pay" clicked → Domain Service: createSale()
         │
         ▼
IPC call → Main Process → SaleRepository
         │
         ▼
SQLite Transaction:
  BEGIN
    INSERT sale
    INSERT sale_items (for each line)
    INSERT payment(s)
    UPDATE inventory (decrement stock)
    INSERT inventory_movement(s)
    INSERT sync_queue (operation = CREATE_SALE)
  COMMIT
         │
         ▼
Return sale result to renderer
         │
         ▼
Print receipt (via HardwareService)
         │
         ▼
Sync Engine picks up queued operation (async, non-blocking)
```

### Cart Calculations

All calculations use integer arithmetic (piasters):

```typescript
// Per item:
lineSubtotal = unitPrice * quantity
lineDiscount = calculateDiscount(lineSubtotal, discountType, discountValue)
lineTaxable  = lineSubtotal - lineDiscount
lineTax      = Math.round(lineTaxable * taxRate / 10000) // taxRate stored as basis points
lineTotal    = lineTaxable + lineTax

// Invoice:
subtotal     = sum(lineSubtotal)
totalDiscount = sum(lineDiscount) + invoiceLevelDiscount
totalTax     = sum(lineTax)
grandTotal   = subtotal - totalDiscount + totalTax
```

> [!IMPORTANT]
> Tax rates are stored as **basis points** (1% = 100 basis points). This avoids decimal division entirely. A 14% tax = 1400 basis points. `tax = amount * 1400 / 10000`.

---

## 9. Offline Architecture

### Core Principle

**The POS application treats "online" as a special case of "offline."** The transaction workflow is identical regardless of connectivity. The Sync Engine is a background process that opportunistically uploads and downloads — it never blocks the cashier.

### What works offline

| Feature | Offline? | Notes |
|---|---|---|
| Cashier login | ✅ | Via cached password verifier |
| Product lookup (barcode/search) | ✅ | Local SQLite |
| Add to cart | ✅ | Local state |
| Complete sale | ✅ | SQLite transaction |
| Print receipt | ✅ | Direct USB/network printer |
| Manage cash session (open/close) | ✅ | Local |
| View local sales | ✅ | Local |
| Manage products (Local Admin) | ✅ | Local with sync queue |
| Manage inventory | ✅ | Local with sync queue |
| Manage customers | ✅ | Local |
| Manage expenses | ✅ | Local |
| View local reports | ✅ | Local aggregation |
| Create backup | ✅ | SQLite file copy |
| Restore backup | ✅ | File replacement with validation |
| Cross-branch reports | ❌ | Requires central DB |
| User/role management | ❌ | Requires central authority (security) |
| Stock transfers (initiate) | ✅ | Queued for sync |
| Stock transfers (receive) | ❌ | Requires sync to know about incoming transfers |
| Purchase orders | ⚠️ | Can draft locally, submit requires sync |

### Offline data bootstrap

When a device is first set up (or after a full reset), it requires one-time Internet to:

1. Authenticate the device with the central server
2. Download the company/branch configuration
3. Download the product catalog, categories, prices, tax rates
4. Download the authorized user list (with password verifiers)
5. Download initial inventory levels
6. Download customer data

After this initial sync, the device can operate indefinitely without Internet.

### Connectivity detection

```typescript
enum ConnectionStatus {
  ONLINE,          // Backend reachable, sync working
  OFFLINE,         // No network
  UNSTABLE,        // Intermittent connectivity
  SERVER_DOWN,     // Network OK but backend unreachable
  SYNCING,         // Currently synchronizing
}
```

Detection strategy:
1. `navigator.onLine` as a fast hint (but not trusted alone)
2. Periodic HTTP HEAD to a lightweight `/api/v1/health` endpoint (every 30s when idle, every 5s during active sync)
3. WebSocket heartbeat when connected
4. Actual sync attempt result as ground truth

---

## 10. Sync Architecture

### Sync Engine Design

The Sync Engine runs in the **Electron Main Process** as a background service. It is completely decoupled from the POS UI.

```
┌──────────────────────────────────────────────────┐
│  SYNC ENGINE (Main Process)                      │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Connectivity │  │ Upload Manager           │ │
│  │ Monitor      │  │  - Read sync_queue       │ │
│  │              │──│  - Batch operations       │ │
│  │ ONLINE?      │  │  - POST to /api/v1/sync  │ │
│  │ OFFLINE?     │  │  - Handle response        │ │
│  └──────────────┘  │  - Mark SYNCED / FAILED   │ │
│                     └──────────────────────────┘ │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ Download Manager                             ││
│  │  - GET /api/v1/sync/changes?since=checkpoint ││
│  │  - Apply changes to local SQLite             ││
│  │  - Update sync_checkpoints                   ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ Conflict Resolver                            ││
│  │  - Detect conflicts                          ││
│  │  - Apply resolution rules                    ││
│  │  - Flag for admin review                     ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### Upload Flow

```
sync_queue record:
  id: ULID
  entity_type: "SALE"
  entity_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV"
  operation: "CREATE"
  payload: { ...serialized sale + items + payments }
  idempotency_key: "sale-01ARZ3NDEKTSV4RRFFQ69G5FAV"
  status: "PENDING"
  retry_count: 0
  created_at: "2026-10-05T10:30:00Z"
  last_attempt_at: null
  error: null

Upload steps:
1. Query sync_queue WHERE status IN ('PENDING', 'FAILED') AND retry_count < max_retries
   ORDER BY created_at ASC LIMIT batch_size
2. Group by entity_type for efficient batching
3. POST /api/v1/sync/upload { operations: [...] }
4. Server validates each operation:
   - Check idempotency_key → if exists, return "already processed" (not an error)
   - Validate company/branch/terminal
   - Apply business rules
   - Insert into PostgreSQL within a transaction
   - Return per-operation result
5. For each result:
   - SUCCESS → mark sync_queue.status = 'SYNCED', set server_id if returned
   - DUPLICATE → mark sync_queue.status = 'SYNCED' (idempotency protection)
   - CONFLICT → mark sync_queue.status = 'CONFLICT', store conflict details
   - ERROR → increment retry_count, set error message, keep status = 'FAILED'
```

### Download Flow

```
1. For each entity_type, read sync_checkpoints.last_sync_at
2. GET /api/v1/sync/changes?entity=products&since=2026-10-05T09:00:00Z&branch_id=xxx
3. Server returns changed records since checkpoint (with version numbers)
4. For each record:
   - If not exists locally → INSERT
   - If exists locally and local version <= server version → UPDATE
   - If exists locally and local version > server version → CONFLICT (local was modified offline)
5. Update sync_checkpoints.last_sync_at to the latest timestamp from the response
6. Paginate if more changes available
```

### Retry Strategy

```
Retry delays (exponential backoff with jitter):
  Attempt 1: 5 seconds
  Attempt 2: 15 seconds
  Attempt 3: 45 seconds
  Attempt 4: 2 minutes
  Attempt 5: 5 minutes
  Max retries: 10 (then requires manual retry from Sync Center)
```

### Sync Checkpoints

```
sync_checkpoints:
  entity_type: "products"
  last_sync_at: "2026-10-05T09:00:00Z"
  last_sync_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV"

  entity_type: "sales"
  last_sync_at: "2026-10-05T09:15:00Z"
  last_sync_id: "01ARZ3NDEKTSV4RRFFQ69G5FBB"
```

### Duplicate Protection (Critical)

Three layers of protection:

1. **Idempotency key on sync_queue**: Every sync operation has a unique `idempotency_key` (e.g., `sale-{sale_ulid}`).
2. **Server-side idempotency table**: The server stores processed idempotency keys in `sync_operations`. Before processing, it checks: `SELECT 1 FROM sync_operations WHERE idempotency_key = $1`. If found, it returns the original result without re-processing.
3. **Database unique constraints**: `sales.id` is a ULID — inserting the same sale twice violates the primary key constraint.

```
Terminal sends sale with idempotency_key = "sale-ABC123"
  → Network timeout (no response received)
  → Terminal retries with same idempotency_key = "sale-ABC123"
  → Server checks: sync_operations WHERE idempotency_key = "sale-ABC123" → FOUND
  → Server returns: { status: "already_processed", original_result: {...} }
  → Terminal marks sync as SYNCED
  → NO duplicate sale created
```

---

## 11. Conflict Resolution

### Conflict Types and Resolution Strategies

| Conflict | Detection | Resolution | Rationale |
|---|---|---|---|
| **Product price changed centrally while POS offline** | Download detects server version > local version | **Server wins** — update local price. New sales use new price. Already-completed sales are immutable. | Central pricing is authoritative. |
| **Product deleted centrally while POS offline** | Download finds `deleted_at` set on server | **Server wins** — soft-delete locally. Product remains on completed sales (historical). POS shows "product unavailable" on scan. | Central catalog management is authoritative. |
| **Product updated locally AND centrally** | Local version ≠ server version, both changed since last sync | **Server wins + notification** — server data takes precedence, admin is notified of the conflict with the local changes for review. | Products are centrally managed. |
| **Inventory: two terminals sell the last unit offline** | After sync, `branch_inventory.quantity` would go negative | **Additive reconciliation** — server applies all movements (sum of all terminal's sales). If resulting stock < 0 and negative inventory is disabled, flag for admin review but DO NOT reject the sales. | Sales are sacred — never discard a completed sale. Inventory discrepancy is an operational issue, not a data integrity issue. |
| **Customer updated on two devices** | Both have changes since last sync | **Merge with server priority** — non-conflicting fields are merged. For conflicting fields (e.g., both changed phone number), server version wins, admin notified. | Low-frequency conflict, server is more likely to have admin-verified data. |
| **Cash session conflicts** | Terminal-specific, unlikely to conflict | **Terminal authority** — each cash session is bound to a terminal. No conflict possible. | Sessions are terminal-scoped by design. |

### Inventory Reconciliation in Detail

```
Scenario:
  Branch stock in PostgreSQL: Coca Cola = 10
  POS-01 goes offline with local stock = 10
  POS-02 goes offline with local stock = 10

  POS-01 sells 3 → local stock = 7, creates movement: -3
  POS-02 sells 4 → local stock = 6, creates movement: -4

  Both reconnect.

Reconciliation:
  Server receives movement from POS-01: -3
    → branch_inventory.quantity = 10 - 3 = 7
  Server receives movement from POS-02: -4
    → branch_inventory.quantity = 7 - 4 = 3

  Final stock: 3 (correct: 10 - 3 - 4 = 3)

  Server pushes corrected stock (3) back to both terminals.
  POS-01 updates local stock: 7 → 3
  POS-02 updates local stock: 6 → 3
```

> [!IMPORTANT]
> The server never overwrites inventory with a terminal's absolute stock value. It always **applies movements additively**. This is the key to correct multi-terminal offline inventory.

### Conflict Resolution Admin UI

Unresolved conflicts appear in the **Sync Center → Conflicts** page:

```
CONFLICT-001
  Type: PRODUCT_UPDATE
  Product: Coca Cola 330ml
  Local Change: Price 10 → 12 (by Cashier Ahmed, POS-ALEX-01)
  Server Change: Price 10 → 11 (by Admin Mahmoud, Dashboard)
  Status: PENDING_REVIEW
  [Accept Server] [Accept Local] [Custom Merge]
```

---

## 12. Authentication

### Online Authentication

```
┌────────┐         ┌─────────┐         ┌───────────┐
│ Client │──POST──▶│ Backend │──verify──│ PostgreSQL│
│        │ /login  │         │  bcrypt  │           │
│        │◀─JWT────│         │          │           │
└────────┘         └─────────┘         └───────────┘

JWT Payload:
{
  sub: "user-ulid",
  company_id: "company-ulid",
  branch_id: "branch-ulid",
  role: "cashier",
  permissions: ["sales.create", "products.view", ...],
  device_id: "device-ulid",
  iat: 1696472400,
  exp: 1696476000  // 1 hour
}

Refresh Token:
  - Stored in HttpOnly cookie (web) or secure storage (Electron)
  - 7-day expiry
  - Rotated on use (old token invalidated)
  - Stored in Redis for blacklist checking
```

### Offline Authentication

When Internet is unavailable, the cashier must still be able to log in. Here is the secure offline authentication mechanism:

#### Setup (during online sync)

```
1. User logs in online successfully
2. Server returns user profile + permissions
3. Electron Main Process:
   a. Derives a password verifier:
      verifier = argon2id(password, salt)
      where salt = crypto.randomBytes(32)
   b. Stores in local_users:
      - user_id (ULID)
      - username
      - password_verifier (argon2id hash)
      - salt
      - permissions (JSON blob, encrypted with device key)
      - cached_at (timestamp)
      - max_offline_days (from admin config, e.g., 30)
      - company_id
      - branch_id
      - role
4. The plaintext password is NEVER stored
```

#### Offline Login Flow

```
1. Cashier enters username + password
2. Main Process looks up local_users WHERE username = $1
3. If not found → "User not available offline. Connect to Internet."
4. If found:
   a. Check max_offline_days: if (now - cached_at) > max_offline_days
      → "Offline credentials expired. Connect to Internet to refresh."
   b. Compute: argon2id(entered_password, stored_salt)
   c. Compare with stored password_verifier
   d. If match → Create local session:
      - session_id: ULID
      - user_id
      - created_at
      - expires_at (configurable, e.g., 8 hours)
      - permissions (decrypted from cache)
   e. If no match → "Invalid credentials" (track attempts, lockout after N failures)
5. Renderer receives session token (local-only JWT or session ID)
6. All subsequent IPC calls validate the local session
```

#### Security measures

- **Argon2id**: Memory-hard hashing — resistant to GPU/ASIC attacks even if SQLite file is stolen.
- **Device binding**: The permission blob is encrypted with a key derived from the device's hardware ID. Copying the SQLite file to another machine won't yield usable permissions.
- **Expiration**: Offline credentials expire after a configurable number of days (default: 30). Admin can force re-authentication by shortening this or revoking the user.
- **Lockout**: After 5 failed offline login attempts, the account is locked locally until Internet is available (admin unlock).
- **Admin control**: Admins can revoke offline access for any user. On next sync, the local user record is deleted or marked inactive.

---

## 13. RBAC

### Role Hierarchy

```
SUPER_ADMIN (platform-level)
  └── Full access to all companies and all features

COMPANY_ADMIN (company-level)
  └── Full access within their company

BRANCH_MANAGER (branch-level)
  └── Full access within assigned branch(es)

INVENTORY_MANAGER (branch-level)
  └── Product and inventory management

CASHIER (terminal-level)
  └── POS operations, basic customer management

ACCOUNTANT (company/branch-level)
  └── Financial reports, expenses, cash sessions

AUDITOR (company/branch-level)
  └── Read-only access to all data
```

### Permission Definitions

```typescript
// Permissions are dot-notation strings
const PERMISSIONS = {
  // Products
  'products.view',
  'products.create',
  'products.update',
  'products.delete',
  'products.import',
  'products.export',

  // Categories
  'categories.view',
  'categories.create',
  'categories.update',
  'categories.delete',

  // Inventory
  'inventory.view',
  'inventory.adjust',
  'inventory.transfer',
  'inventory.count',

  // Sales
  'sales.view',
  'sales.create',
  'sales.cancel',
  'sales.refund',
  'sales.discount',
  'sales.export',

  // Customers
  'customers.view',
  'customers.create',
  'customers.update',
  'customers.delete',

  // Suppliers
  'suppliers.view',
  'suppliers.create',
  'suppliers.update',
  'suppliers.delete',

  // Purchases
  'purchases.view',
  'purchases.create',
  'purchases.approve',
  'purchases.receive',

  // Users
  'users.view',
  'users.create',
  'users.update',
  'users.disable',
  'users.reset_password',

  // Roles
  'roles.view',
  'roles.create',
  'roles.update',
  'roles.delete',

  // Cash Sessions
  'cash_sessions.view',
  'cash_sessions.open',
  'cash_sessions.close',
  'cash_sessions.adjust',

  // Expenses
  'expenses.view',
  'expenses.create',
  'expenses.update',
  'expenses.delete',

  // Reports
  'reports.view',
  'reports.export',
  'reports.financial',

  // Settings
  'settings.view',
  'settings.update',
  'settings.company',
  'settings.branch',

  // Sync
  'sync.view',
  'sync.retry',
  'sync.force',

  // Audit
  'audit_logs.view',

  // Backups
  'backups.create',
  'backups.restore',
  'backups.export',
  'backups.import',

  // Devices
  'devices.view',
  'devices.register',
  'devices.deactivate',
} as const;
```

### Enforcement

```
BACKEND (authoritative):
  NestJS Guard → extracts JWT → checks user.permissions.includes(required_permission)
  Every controller method decorated with @RequirePermission('sales.create')

FRONTEND (UX only):
  <PermissionGuard permission="sales.refund">
    <RefundButton />
  </PermissionGuard>
  // Hides UI elements the user can't use — but NEVER the sole security layer

LOCAL (Electron):
  Main Process checks the locally cached permission set before executing IPC handlers
  This is a UX + safety measure; the authoritative check happens when the operation syncs to the server
```

### Custom Roles

Admins can create custom roles by selecting a subset of permissions:

```
Role: "Senior Cashier"
Permissions:
  ✅ sales.create
  ✅ sales.view
  ✅ sales.refund      ← not available to regular cashier
  ✅ products.view
  ✅ customers.view
  ✅ customers.create
  ✅ cash_sessions.open
  ✅ cash_sessions.close
  ❌ products.create
  ❌ inventory.adjust
  ❌ settings.update
```

---

## 14. Database ERD

### Local SQLite ERD (Textual)

```
local_device
  id              TEXT PK (ULID)
  company_id      TEXT NOT NULL
  company_name    TEXT NOT NULL
  branch_id       TEXT NOT NULL
  branch_name     TEXT NOT NULL
  terminal_id     TEXT NOT NULL
  terminal_name   TEXT NOT NULL
  device_key      TEXT NOT NULL        -- hardware-derived encryption key
  app_version     TEXT NOT NULL
  db_version      INTEGER NOT NULL
  registered_at   TEXT NOT NULL
  last_sync_at    TEXT

local_users
  id              TEXT PK (ULID)
  username        TEXT NOT NULL UNIQUE
  full_name       TEXT NOT NULL
  password_verifier TEXT NOT NULL      -- argon2id hash
  salt            TEXT NOT NULL
  role            TEXT NOT NULL
  permissions     TEXT NOT NULL        -- encrypted JSON blob
  branch_id       TEXT NOT NULL
  is_active       INTEGER NOT NULL DEFAULT 1
  cached_at       TEXT NOT NULL
  max_offline_days INTEGER NOT NULL DEFAULT 30
  failed_attempts INTEGER NOT NULL DEFAULT 0
  locked_until    TEXT

local_sessions
  id              TEXT PK (ULID)
  user_id         TEXT NOT NULL → local_users.id
  created_at      TEXT NOT NULL
  expires_at      TEXT NOT NULL
  is_active       INTEGER NOT NULL DEFAULT 1

products
  id              TEXT PK (ULID)
  company_id      TEXT NOT NULL
  name_ar         TEXT NOT NULL
  name_en         TEXT
  sku             TEXT
  category_id     TEXT → categories.id
  brand_id        TEXT → brands.id
  unit_id         TEXT → units.id
  cost_price      INTEGER NOT NULL DEFAULT 0     -- piasters
  selling_price   INTEGER NOT NULL DEFAULT 0     -- piasters
  wholesale_price INTEGER DEFAULT 0
  min_price       INTEGER DEFAULT 0
  tax_rate_id     TEXT → tax_rates.id
  product_type    TEXT NOT NULL DEFAULT 'STANDARD'  -- STANDARD, WEIGHTED, SERVICE, VARIANT
  min_stock       INTEGER DEFAULT 0
  max_stock       INTEGER
  weight          REAL
  image_path      TEXT
  description     TEXT
  is_active       INTEGER NOT NULL DEFAULT 1
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TEXT NOT NULL
  updated_at      TEXT NOT NULL
  deleted_at      TEXT
  sync_status     TEXT NOT NULL DEFAULT 'SYNCED'

product_barcodes
  id              TEXT PK (ULID)
  product_id      TEXT NOT NULL → products.id
  barcode         TEXT NOT NULL
  is_primary      INTEGER NOT NULL DEFAULT 0
  created_at      TEXT NOT NULL
  UNIQUE(barcode)    -- within this local DB (company-scoped)

categories
  id              TEXT PK (ULID)
  company_id      TEXT NOT NULL
  name_ar         TEXT NOT NULL
  name_en         TEXT
  parent_id       TEXT → categories.id
  sort_order      INTEGER NOT NULL DEFAULT 0
  image_path      TEXT
  is_active       INTEGER NOT NULL DEFAULT 1
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TEXT NOT NULL
  updated_at      TEXT NOT NULL
  deleted_at      TEXT

brands
  id              TEXT PK (ULID)
  company_id      TEXT NOT NULL
  name_ar         TEXT NOT NULL
  name_en         TEXT
  is_active       INTEGER NOT NULL DEFAULT 1
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TEXT NOT NULL
  updated_at      TEXT NOT NULL
  deleted_at      TEXT

units
  id              TEXT PK (ULID)
  company_id      TEXT NOT NULL
  name_ar         TEXT NOT NULL
  name_en         TEXT
  abbreviation    TEXT
  is_active       INTEGER NOT NULL DEFAULT 1
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TEXT NOT NULL
  updated_at      TEXT NOT NULL

tax_rates
  id              TEXT PK (ULID)
  company_id      TEXT NOT NULL
  name            TEXT NOT NULL
  rate            INTEGER NOT NULL     -- basis points (1% = 100)
  is_inclusive     INTEGER NOT NULL DEFAULT 0
  is_active       INTEGER NOT NULL DEFAULT 1
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TEXT NOT NULL
  updated_at      TEXT NOT NULL

product_prices
  id              TEXT PK (ULID)
  product_id      TEXT NOT NULL → products.id
  price_type      TEXT NOT NULL        -- RETAIL, WHOLESALE, PROMOTIONAL
  amount          INTEGER NOT NULL     -- piasters
  branch_id       TEXT                 -- NULL = all branches
  starts_at       TEXT
  ends_at         TEXT
  is_active       INTEGER NOT NULL DEFAULT 1
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TEXT NOT NULL
  updated_at      TEXT NOT NULL

inventory
  id              TEXT PK (ULID)
  product_id      TEXT NOT NULL → products.id
  branch_id       TEXT NOT NULL
  quantity         INTEGER NOT NULL DEFAULT 0
  reserved         INTEGER NOT NULL DEFAULT 0   -- held for pending orders
  version          INTEGER NOT NULL DEFAULT 1
  updated_at       TEXT NOT NULL
  UNIQUE(product_id, branch_id)

inventory_movements
  id              TEXT PK (ULID)
  product_id      TEXT NOT NULL → products.id
  branch_id       TEXT NOT NULL
  terminal_id     TEXT
  movement_type   TEXT NOT NULL    -- SALE, PURCHASE, ADJUSTMENT, TRANSFER_OUT, TRANSFER_IN, DAMAGE, OPENING, RETURN
  quantity         INTEGER NOT NULL  -- positive for in, negative for out
  reference_type   TEXT             -- SALE, PURCHASE_ORDER, ADJUSTMENT, TRANSFER
  reference_id     TEXT             -- ULID of referenced entity
  reason           TEXT
  user_id          TEXT NOT NULL
  created_at       TEXT NOT NULL
  sync_status      TEXT NOT NULL DEFAULT 'PENDING'

customers
  id              TEXT PK (ULID)
  company_id      TEXT NOT NULL
  name            TEXT NOT NULL
  phone           TEXT
  email           TEXT
  address         TEXT
  notes           TEXT
  loyalty_points  INTEGER NOT NULL DEFAULT 0
  credit_balance  INTEGER NOT NULL DEFAULT 0    -- piasters
  is_active       INTEGER NOT NULL DEFAULT 1
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TEXT NOT NULL
  updated_at      TEXT NOT NULL
  deleted_at      TEXT

sales
  id              TEXT PK (ULID)
  company_id      TEXT NOT NULL
  branch_id       TEXT NOT NULL
  terminal_id     TEXT NOT NULL
  cashier_id      TEXT NOT NULL → local_users.id
  customer_id     TEXT → customers.id
  invoice_number  TEXT NOT NULL
  subtotal        INTEGER NOT NULL     -- piasters
  discount_amount INTEGER NOT NULL DEFAULT 0
  tax_amount      INTEGER NOT NULL DEFAULT 0
  total_amount    INTEGER NOT NULL
  status          TEXT NOT NULL DEFAULT 'COMPLETED'
    -- COMPLETED, HELD, CANCELLED, REFUNDED, PARTIALLY_REFUNDED
  notes           TEXT
  idempotency_key TEXT NOT NULL UNIQUE
  server_id       TEXT                -- populated after sync
  sync_status     TEXT NOT NULL DEFAULT 'PENDING'
    -- PENDING, SYNCING, SYNCED, FAILED, CONFLICT
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TEXT NOT NULL
  updated_at      TEXT NOT NULL

sale_items
  id              TEXT PK (ULID)
  sale_id         TEXT NOT NULL → sales.id
  product_id      TEXT NOT NULL → products.id
  product_name    TEXT NOT NULL       -- denormalized for receipt/history
  barcode         TEXT
  quantity        INTEGER NOT NULL    -- in smallest unit
  unit_price      INTEGER NOT NULL    -- piasters
  discount_type   TEXT               -- PERCENTAGE, FIXED
  discount_value  INTEGER DEFAULT 0
  discount_amount INTEGER NOT NULL DEFAULT 0
  tax_rate        INTEGER NOT NULL DEFAULT 0    -- basis points
  tax_amount      INTEGER NOT NULL DEFAULT 0
  subtotal        INTEGER NOT NULL
  total           INTEGER NOT NULL
  created_at      TEXT NOT NULL

payments
  id              TEXT PK (ULID)
  sale_id         TEXT NOT NULL → sales.id
  method          TEXT NOT NULL       -- CASH, CARD, BANK_TRANSFER, WALLET
  amount          INTEGER NOT NULL    -- piasters
  received        INTEGER            -- for cash: amount tendered
  change_amount   INTEGER            -- for cash: change given
  reference       TEXT               -- card auth code, transfer ref, etc.
  created_at      TEXT NOT NULL

refunds
  id              TEXT PK (ULID)
  sale_id         TEXT NOT NULL → sales.id
  company_id      TEXT NOT NULL
  branch_id       TEXT NOT NULL
  terminal_id     TEXT NOT NULL
  cashier_id      TEXT NOT NULL
  refund_type     TEXT NOT NULL       -- FULL, PARTIAL
  total_amount    INTEGER NOT NULL
  reason          TEXT NOT NULL
  idempotency_key TEXT NOT NULL UNIQUE
  sync_status     TEXT NOT NULL DEFAULT 'PENDING'
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TEXT NOT NULL

refund_items
  id              TEXT PK (ULID)
  refund_id       TEXT NOT NULL → refunds.id
  sale_item_id    TEXT NOT NULL → sale_items.id
  product_id      TEXT NOT NULL
  quantity        INTEGER NOT NULL
  amount          INTEGER NOT NULL
  created_at      TEXT NOT NULL

held_carts
  id              TEXT PK (ULID)
  cashier_id      TEXT NOT NULL
  terminal_id     TEXT NOT NULL
  customer_id     TEXT
  label           TEXT
  cart_data       TEXT NOT NULL       -- JSON serialized cart
  created_at      TEXT NOT NULL
  updated_at      TEXT NOT NULL

cash_sessions
  id              TEXT PK (ULID)
  company_id      TEXT NOT NULL
  branch_id       TEXT NOT NULL
  terminal_id     TEXT NOT NULL
  cashier_id      TEXT NOT NULL
  opening_amount  INTEGER NOT NULL    -- piasters
  closing_amount  INTEGER            -- NULL until closed
  expected_amount INTEGER            -- calculated at close
  difference      INTEGER            -- actual - expected
  status          TEXT NOT NULL DEFAULT 'OPEN'   -- OPEN, CLOSED
  opened_at       TEXT NOT NULL
  closed_at       TEXT
  notes           TEXT
  sync_status     TEXT NOT NULL DEFAULT 'PENDING'
  version         INTEGER NOT NULL DEFAULT 1

cash_movements
  id              TEXT PK (ULID)
  session_id      TEXT NOT NULL → cash_sessions.id
  movement_type   TEXT NOT NULL       -- SALE, REFUND, DEPOSIT, WITHDRAWAL, EXPENSE
  amount          INTEGER NOT NULL    -- positive for in, negative for out
  reference_type  TEXT               -- SALE, REFUND, EXPENSE
  reference_id    TEXT
  reason          TEXT
  user_id         TEXT NOT NULL
  created_at      TEXT NOT NULL
  sync_status     TEXT NOT NULL DEFAULT 'PENDING'

expenses
  id              TEXT PK (ULID)
  company_id      TEXT NOT NULL
  branch_id       TEXT NOT NULL
  category        TEXT NOT NULL
  amount          INTEGER NOT NULL    -- piasters
  payment_method  TEXT NOT NULL
  description     TEXT
  user_id         TEXT NOT NULL
  attachment_path TEXT
  created_at      TEXT NOT NULL
  sync_status     TEXT NOT NULL DEFAULT 'PENDING'
  version         INTEGER NOT NULL DEFAULT 1

sync_queue
  id              TEXT PK (ULID)
  entity_type     TEXT NOT NULL       -- SALE, PRODUCT, INVENTORY_MOVEMENT, etc.
  entity_id       TEXT NOT NULL
  operation       TEXT NOT NULL       -- CREATE, UPDATE, DELETE
  payload         TEXT NOT NULL       -- JSON
  idempotency_key TEXT NOT NULL UNIQUE
  status          TEXT NOT NULL DEFAULT 'PENDING'
    -- PENDING, SYNCING, SYNCED, FAILED, CONFLICT, CANCELLED
  retry_count     INTEGER NOT NULL DEFAULT 0
  max_retries     INTEGER NOT NULL DEFAULT 10
  error           TEXT
  created_at      TEXT NOT NULL
  last_attempt_at TEXT
  synced_at       TEXT

sync_log
  id              TEXT PK (ULID)
  direction       TEXT NOT NULL       -- UPLOAD, DOWNLOAD
  entity_type     TEXT
  records_count   INTEGER
  status          TEXT NOT NULL       -- SUCCESS, PARTIAL, FAILED
  error           TEXT
  started_at      TEXT NOT NULL
  completed_at    TEXT
  duration_ms     INTEGER

sync_checkpoints
  entity_type     TEXT PK
  last_sync_at    TEXT NOT NULL
  last_sync_id    TEXT
  updated_at      TEXT NOT NULL

local_settings
  key             TEXT PK
  value           TEXT NOT NULL
  updated_at      TEXT NOT NULL

audit_log
  id              TEXT PK (ULID)
  user_id         TEXT NOT NULL
  action          TEXT NOT NULL
  entity_type     TEXT NOT NULL
  entity_id       TEXT
  old_value       TEXT               -- JSON
  new_value       TEXT               -- JSON
  terminal_id     TEXT
  created_at      TEXT NOT NULL

backup_metadata
  id              TEXT PK (ULID)
  filename        TEXT NOT NULL
  version         TEXT NOT NULL       -- app version
  db_version      INTEGER NOT NULL
  company_id      TEXT NOT NULL
  branch_id       TEXT NOT NULL
  device_id       TEXT NOT NULL
  checksum        TEXT NOT NULL       -- SHA-256
  size_bytes      INTEGER NOT NULL
  created_at      TEXT NOT NULL

-- INDEXES (critical for POS speed):
CREATE INDEX idx_products_sku ON products(sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_barcodes_barcode ON product_barcodes(barcode);
CREATE INDEX idx_products_name_ar ON products(name_ar) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_product_branch ON inventory(product_id, branch_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_cashier ON sales(cashier_id, created_at);
CREATE INDEX idx_sales_sync_status ON sales(sync_status) WHERE sync_status != 'SYNCED';
CREATE INDEX idx_sync_queue_status ON sync_queue(status, created_at) WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id, created_at);
CREATE INDEX idx_customers_phone ON customers(phone) WHERE deleted_at IS NULL;
```

### Central PostgreSQL ERD (Textual)

```
companies
  id              UUID PK DEFAULT gen_random_uuid()
  name            VARCHAR(255) NOT NULL
  name_ar         VARCHAR(255)
  logo_url        TEXT
  email           VARCHAR(255)
  phone           VARCHAR(50)
  address         TEXT
  tax_number      VARCHAR(100)
  currency_code   VARCHAR(3) NOT NULL DEFAULT 'EGP'
  currency_subunit INTEGER NOT NULL DEFAULT 100   -- 100 piasters per EGP
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

company_settings
  id              UUID PK
  company_id      UUID NOT NULL → companies.id UNIQUE
  negative_inventory_allowed BOOLEAN NOT NULL DEFAULT FALSE
  negative_inventory_roles   JSONB     -- roles allowed if enabled
  max_offline_days           INTEGER NOT NULL DEFAULT 30
  max_login_attempts         INTEGER NOT NULL DEFAULT 5
  receipt_template           JSONB
  tax_mode                   VARCHAR(20) NOT NULL DEFAULT 'EXCLUSIVE'  -- INCLUSIVE, EXCLUSIVE
  default_tax_rate_id        UUID
  fiscal_year_start          INTEGER NOT NULL DEFAULT 1    -- month
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()

branches
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  name            VARCHAR(255) NOT NULL
  name_ar         VARCHAR(255)
  code            VARCHAR(50) NOT NULL
  address         TEXT
  phone           VARCHAR(50)
  email           VARCHAR(255)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE(company_id, code)

branch_settings
  id              UUID PK
  branch_id       UUID NOT NULL → branches.id UNIQUE
  receipt_header  TEXT
  receipt_footer  TEXT
  settings_json   JSONB
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

devices
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  branch_id       UUID NOT NULL → branches.id
  device_name     VARCHAR(255) NOT NULL
  device_key_hash VARCHAR(255) NOT NULL
  app_version     VARCHAR(50)
  db_version      INTEGER
  last_seen_at    TIMESTAMPTZ
  last_sync_at    TIMESTAMPTZ
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'  -- ACTIVE, INACTIVE, REVOKED
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

pos_terminals
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  branch_id       UUID NOT NULL → branches.id
  device_id       UUID → devices.id
  terminal_code   VARCHAR(50) NOT NULL
  terminal_name   VARCHAR(255) NOT NULL
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE(company_id, branch_id, terminal_code)

users
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  username        VARCHAR(100) NOT NULL
  email           VARCHAR(255)
  full_name       VARCHAR(255) NOT NULL
  password_hash   VARCHAR(255) NOT NULL    -- bcrypt/argon2id
  phone           VARCHAR(50)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  is_locked       BOOLEAN NOT NULL DEFAULT FALSE
  locked_until    TIMESTAMPTZ
  failed_login_attempts INTEGER NOT NULL DEFAULT 0
  last_login_at   TIMESTAMPTZ
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE
  offline_access_enabled BOOLEAN NOT NULL DEFAULT TRUE
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  deleted_at      TIMESTAMPTZ
  UNIQUE(company_id, username)

roles
  id              UUID PK
  company_id      UUID             -- NULL for system roles
  name            VARCHAR(100) NOT NULL
  description     TEXT
  is_system       BOOLEAN NOT NULL DEFAULT FALSE
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

permissions
  id              UUID PK
  code            VARCHAR(100) NOT NULL UNIQUE
  name            VARCHAR(255) NOT NULL
  description     TEXT
  module          VARCHAR(100) NOT NULL
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

role_permissions
  role_id         UUID NOT NULL → roles.id
  permission_id   UUID NOT NULL → permissions.id
  PRIMARY KEY (role_id, permission_id)

user_roles
  user_id         UUID NOT NULL → users.id
  role_id         UUID NOT NULL → roles.id
  PRIMARY KEY (user_id, role_id)

user_branches
  user_id         UUID NOT NULL → users.id
  branch_id       UUID NOT NULL → branches.id
  PRIMARY KEY (user_id, branch_id)

products
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  name_ar         VARCHAR(255) NOT NULL
  name_en         VARCHAR(255)
  sku             VARCHAR(100)
  category_id     UUID → categories.id
  brand_id        UUID → brands.id
  unit_id         UUID → units.id
  cost_price      BIGINT NOT NULL DEFAULT 0
  selling_price   BIGINT NOT NULL DEFAULT 0
  wholesale_price BIGINT DEFAULT 0
  min_price       BIGINT DEFAULT 0
  tax_rate_id     UUID → tax_rates.id
  product_type    VARCHAR(20) NOT NULL DEFAULT 'STANDARD'
  min_stock       INTEGER DEFAULT 0
  max_stock       INTEGER
  weight          DECIMAL(10,3)
  image_url       TEXT
  description     TEXT
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  deleted_at      TIMESTAMPTZ
  UNIQUE(company_id, sku)

product_barcodes
  id              UUID PK
  product_id      UUID NOT NULL → products.id
  barcode         VARCHAR(100) NOT NULL
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE(barcode)  -- global uniqueness within company enforced at app level

categories
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  name_ar         VARCHAR(255) NOT NULL
  name_en         VARCHAR(255)
  parent_id       UUID → categories.id
  sort_order      INTEGER NOT NULL DEFAULT 0
  image_url       TEXT
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  deleted_at      TIMESTAMPTZ

brands
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  name_ar         VARCHAR(255) NOT NULL
  name_en         VARCHAR(255)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  deleted_at      TIMESTAMPTZ

units
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  name_ar         VARCHAR(100) NOT NULL
  name_en         VARCHAR(100)
  abbreviation    VARCHAR(20)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

tax_rates
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  name            VARCHAR(100) NOT NULL
  rate            INTEGER NOT NULL         -- basis points
  is_inclusive    BOOLEAN NOT NULL DEFAULT FALSE
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

product_prices
  id              UUID PK
  product_id      UUID NOT NULL → products.id
  price_type      VARCHAR(20) NOT NULL
  amount          BIGINT NOT NULL
  branch_id       UUID → branches.id
  starts_at       TIMESTAMPTZ
  ends_at         TIMESTAMPTZ
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

price_history
  id              UUID PK
  product_id      UUID NOT NULL → products.id
  field           VARCHAR(50) NOT NULL    -- selling_price, cost_price, etc.
  old_value       BIGINT
  new_value       BIGINT NOT NULL
  changed_by      UUID NOT NULL → users.id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

branch_inventory
  id              UUID PK
  product_id      UUID NOT NULL → products.id
  branch_id       UUID NOT NULL → branches.id
  company_id      UUID NOT NULL → companies.id
  quantity        INTEGER NOT NULL DEFAULT 0
  reserved        INTEGER NOT NULL DEFAULT 0
  version         INTEGER NOT NULL DEFAULT 1
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE(product_id, branch_id)

inventory_movements
  id              UUID PK
  product_id      UUID NOT NULL → products.id
  branch_id       UUID NOT NULL → branches.id
  company_id      UUID NOT NULL → companies.id
  terminal_id     UUID
  movement_type   VARCHAR(30) NOT NULL
  quantity        INTEGER NOT NULL
  reference_type  VARCHAR(30)
  reference_id    UUID
  reason          TEXT
  user_id         UUID NOT NULL → users.id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

stock_transfers
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  from_branch_id  UUID NOT NULL → branches.id
  to_branch_id    UUID NOT NULL → branches.id
  status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    -- DRAFT, SUBMITTED, APPROVED, SHIPPED, RECEIVED, COMPLETED, CANCELLED
  requested_by    UUID NOT NULL → users.id
  approved_by     UUID → users.id
  shipped_at      TIMESTAMPTZ
  received_at     TIMESTAMPTZ
  notes           TEXT
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

stock_transfer_items
  id              UUID PK
  transfer_id     UUID NOT NULL → stock_transfers.id
  product_id      UUID NOT NULL → products.id
  requested_qty   INTEGER NOT NULL
  shipped_qty     INTEGER
  received_qty    INTEGER
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

suppliers
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  name            VARCHAR(255) NOT NULL
  phone           VARCHAR(50)
  email           VARCHAR(255)
  address         TEXT
  tax_number      VARCHAR(100)
  balance         BIGINT NOT NULL DEFAULT 0    -- piasters (positive = we owe them)
  notes           TEXT
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  deleted_at      TIMESTAMPTZ

purchase_orders
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  branch_id       UUID NOT NULL → branches.id
  supplier_id     UUID NOT NULL → suppliers.id
  po_number       VARCHAR(100) NOT NULL
  status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    -- DRAFT, SUBMITTED, APPROVED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
  subtotal        BIGINT NOT NULL DEFAULT 0
  discount_amount BIGINT NOT NULL DEFAULT 0
  tax_amount      BIGINT NOT NULL DEFAULT 0
  total_amount    BIGINT NOT NULL DEFAULT 0
  notes           TEXT
  created_by      UUID NOT NULL → users.id
  approved_by     UUID → users.id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE(company_id, po_number)

purchase_order_items
  id              UUID PK
  po_id           UUID NOT NULL → purchase_orders.id
  product_id      UUID NOT NULL → products.id
  ordered_qty     INTEGER NOT NULL
  received_qty    INTEGER NOT NULL DEFAULT 0
  unit_cost       BIGINT NOT NULL
  discount        BIGINT NOT NULL DEFAULT 0
  tax_amount      BIGINT NOT NULL DEFAULT 0
  total           BIGINT NOT NULL
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

supplier_payments
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  supplier_id     UUID NOT NULL → suppliers.id
  po_id           UUID → purchase_orders.id
  amount          BIGINT NOT NULL
  payment_method  VARCHAR(30) NOT NULL
  reference       TEXT
  notes           TEXT
  paid_by         UUID NOT NULL → users.id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

customers
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  name            VARCHAR(255) NOT NULL
  phone           VARCHAR(50)
  email           VARCHAR(255)
  address         TEXT
  notes           TEXT
  loyalty_points  INTEGER NOT NULL DEFAULT 0
  credit_balance  BIGINT NOT NULL DEFAULT 0
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  deleted_at      TIMESTAMPTZ

sales
  id              UUID PK       -- ULID from terminal
  company_id      UUID NOT NULL → companies.id
  branch_id       UUID NOT NULL → branches.id
  terminal_id     UUID NOT NULL → pos_terminals.id
  cashier_id      UUID NOT NULL → users.id
  customer_id     UUID → customers.id
  invoice_number  VARCHAR(100) NOT NULL
  subtotal        BIGINT NOT NULL
  discount_amount BIGINT NOT NULL DEFAULT 0
  tax_amount      BIGINT NOT NULL DEFAULT 0
  total_amount    BIGINT NOT NULL
  status          VARCHAR(30) NOT NULL DEFAULT 'COMPLETED'
  notes           TEXT
  idempotency_key VARCHAR(255) NOT NULL UNIQUE
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE(company_id, invoice_number)

sale_items
  id              UUID PK
  sale_id         UUID NOT NULL → sales.id
  product_id      UUID NOT NULL → products.id
  product_name    VARCHAR(255) NOT NULL
  barcode         VARCHAR(100)
  quantity        INTEGER NOT NULL
  unit_price      BIGINT NOT NULL
  discount_type   VARCHAR(20)
  discount_value  BIGINT DEFAULT 0
  discount_amount BIGINT NOT NULL DEFAULT 0
  tax_rate        INTEGER NOT NULL DEFAULT 0
  tax_amount      BIGINT NOT NULL DEFAULT 0
  subtotal        BIGINT NOT NULL
  total           BIGINT NOT NULL
  created_at      TIMESTAMPTZ NOT NULL

payments
  id              UUID PK
  sale_id         UUID NOT NULL → sales.id
  method          VARCHAR(30) NOT NULL
  amount          BIGINT NOT NULL
  received        BIGINT
  change_amount   BIGINT
  reference       TEXT
  created_at      TIMESTAMPTZ NOT NULL

refunds
  id              UUID PK
  sale_id         UUID NOT NULL → sales.id
  company_id      UUID NOT NULL → companies.id
  branch_id       UUID NOT NULL → branches.id
  terminal_id     UUID NOT NULL → pos_terminals.id
  cashier_id      UUID NOT NULL → users.id
  refund_type     VARCHAR(20) NOT NULL
  total_amount    BIGINT NOT NULL
  reason          TEXT NOT NULL
  idempotency_key VARCHAR(255) NOT NULL UNIQUE
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL

refund_items
  id              UUID PK
  refund_id       UUID NOT NULL → refunds.id
  sale_item_id    UUID NOT NULL → sale_items.id
  product_id      UUID NOT NULL → products.id
  quantity        INTEGER NOT NULL
  amount          BIGINT NOT NULL
  created_at      TIMESTAMPTZ NOT NULL

cash_sessions
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  branch_id       UUID NOT NULL → branches.id
  terminal_id     UUID NOT NULL → pos_terminals.id
  cashier_id      UUID NOT NULL → users.id
  opening_amount  BIGINT NOT NULL
  closing_amount  BIGINT
  expected_amount BIGINT
  difference      BIGINT
  status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'
  opened_at       TIMESTAMPTZ NOT NULL
  closed_at       TIMESTAMPTZ
  notes           TEXT
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

cash_movements
  id              UUID PK
  session_id      UUID NOT NULL → cash_sessions.id
  movement_type   VARCHAR(30) NOT NULL
  amount          BIGINT NOT NULL
  reference_type  VARCHAR(30)
  reference_id    UUID
  reason          TEXT
  user_id         UUID NOT NULL → users.id
  created_at      TIMESTAMPTZ NOT NULL

expenses
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  branch_id       UUID NOT NULL → branches.id
  category_id     UUID → expense_categories.id
  amount          BIGINT NOT NULL
  payment_method  VARCHAR(30) NOT NULL
  description     TEXT
  user_id         UUID NOT NULL → users.id
  attachment_url  TEXT
  version         INTEGER NOT NULL DEFAULT 1
  created_at      TIMESTAMPTZ NOT NULL
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

expense_categories
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  name_ar         VARCHAR(255) NOT NULL
  name_en         VARCHAR(255)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

sync_operations
  id              UUID PK
  device_id       UUID NOT NULL → devices.id
  company_id      UUID NOT NULL → companies.id
  branch_id       UUID NOT NULL → branches.id
  entity_type     VARCHAR(50) NOT NULL
  entity_id       UUID NOT NULL
  operation       VARCHAR(20) NOT NULL
  idempotency_key VARCHAR(255) NOT NULL UNIQUE
  payload         JSONB NOT NULL
  status          VARCHAR(20) NOT NULL DEFAULT 'PROCESSED'
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  created_at      TIMESTAMPTZ NOT NULL

sync_logs
  id              UUID PK
  device_id       UUID NOT NULL → devices.id
  direction       VARCHAR(10) NOT NULL
  entity_type     VARCHAR(50)
  records_count   INTEGER
  status          VARCHAR(20) NOT NULL
  error           TEXT
  started_at      TIMESTAMPTZ NOT NULL
  completed_at    TIMESTAMPTZ
  duration_ms     INTEGER

sync_conflicts
  id              UUID PK
  device_id       UUID NOT NULL → devices.id
  company_id      UUID NOT NULL → companies.id
  entity_type     VARCHAR(50) NOT NULL
  entity_id       UUID NOT NULL
  conflict_type   VARCHAR(50) NOT NULL
  local_data      JSONB NOT NULL
  server_data     JSONB NOT NULL
  resolution      VARCHAR(30)        -- SERVER_WINS, LOCAL_WINS, MERGED, ADMIN_RESOLVED
  resolved_by     UUID → users.id
  resolved_at     TIMESTAMPTZ
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

audit_logs (PARTITIONED BY RANGE (created_at))
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  user_id         UUID NOT NULL
  action          VARCHAR(100) NOT NULL
  entity_type     VARCHAR(50) NOT NULL
  entity_id       UUID
  branch_id       UUID
  old_value       JSONB
  new_value       JSONB
  device_id       UUID
  ip_address      INET
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

notifications
  id              UUID PK
  company_id      UUID NOT NULL → companies.id
  branch_id       UUID → branches.id
  type            VARCHAR(50) NOT NULL
  title           VARCHAR(255) NOT NULL
  message         TEXT NOT NULL
  severity        VARCHAR(20) NOT NULL DEFAULT 'INFO'
  is_read         BOOLEAN NOT NULL DEFAULT FALSE
  data            JSONB
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- REPORTING TABLES (materialized/refreshed)

daily_sales_summary
  id              UUID PK
  company_id      UUID NOT NULL
  branch_id       UUID NOT NULL
  date            DATE NOT NULL
  total_sales     BIGINT NOT NULL DEFAULT 0
  total_transactions INTEGER NOT NULL DEFAULT 0
  total_refunds   BIGINT NOT NULL DEFAULT 0
  refund_count    INTEGER NOT NULL DEFAULT 0
  total_discount  BIGINT NOT NULL DEFAULT 0
  total_tax       BIGINT NOT NULL DEFAULT 0
  net_revenue     BIGINT NOT NULL DEFAULT 0
  cash_sales      BIGINT NOT NULL DEFAULT 0
  card_sales      BIGINT NOT NULL DEFAULT 0
  other_sales     BIGINT NOT NULL DEFAULT 0
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE(company_id, branch_id, date)

product_sales_summary
  id              UUID PK
  company_id      UUID NOT NULL
  branch_id       UUID NOT NULL
  product_id      UUID NOT NULL
  period          DATE NOT NULL        -- first day of period
  period_type     VARCHAR(10) NOT NULL -- DAILY, WEEKLY, MONTHLY
  quantity_sold   INTEGER NOT NULL DEFAULT 0
  revenue         BIGINT NOT NULL DEFAULT 0
  cost            BIGINT NOT NULL DEFAULT 0
  profit          BIGINT NOT NULL DEFAULT 0
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE(company_id, branch_id, product_id, period, period_type)
```

---

## 15. API Architecture

### Base URL

```
https://api.example.com/api/v1
```

### Standard Response Format

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "name", "message": "Name is required" }
    ]
  }
}
```

### Authentication Endpoints

```
POST   /api/v1/auth/login           — Authenticate user
POST   /api/v1/auth/logout          — Invalidate session
POST   /api/v1/auth/refresh         — Refresh access token
POST   /api/v1/auth/password/change — Change password
POST   /api/v1/auth/password/reset  — Request password reset
POST   /api/v1/auth/device/register — Register a device
POST   /api/v1/auth/device/verify   — Verify device identity
```

### Company & Branch Endpoints

```
GET    /api/v1/companies                 — List companies (super admin)
GET    /api/v1/companies/:id             — Get company details
PUT    /api/v1/companies/:id             — Update company
GET    /api/v1/companies/:id/settings    — Get company settings
PUT    /api/v1/companies/:id/settings    — Update company settings

GET    /api/v1/branches                  — List branches (scoped by company)
POST   /api/v1/branches                  — Create branch
GET    /api/v1/branches/:id              — Get branch
PUT    /api/v1/branches/:id              — Update branch
DELETE /api/v1/branches/:id              — Deactivate branch
GET    /api/v1/branches/:id/settings     — Get branch settings
PUT    /api/v1/branches/:id/settings     — Update branch settings
```

### User & RBAC Endpoints

```
GET    /api/v1/users                     — List users
POST   /api/v1/users                     — Create user
GET    /api/v1/users/:id                 — Get user
PUT    /api/v1/users/:id                 — Update user
DELETE /api/v1/users/:id                 — Deactivate user
POST   /api/v1/users/:id/lock           — Lock account
POST   /api/v1/users/:id/unlock         — Unlock account
POST   /api/v1/users/:id/reset-password — Reset password
GET    /api/v1/users/:id/activity       — Get user activity
GET    /api/v1/users/:id/sales          — Get user's sales

GET    /api/v1/roles                     — List roles
POST   /api/v1/roles                     — Create custom role
GET    /api/v1/roles/:id                 — Get role with permissions
PUT    /api/v1/roles/:id                 — Update role
DELETE /api/v1/roles/:id                 — Delete custom role
GET    /api/v1/permissions               — List all permissions
```

### Device & Terminal Endpoints

```
GET    /api/v1/devices                   — List devices
GET    /api/v1/devices/:id               — Get device details
PUT    /api/v1/devices/:id               — Update device
DELETE /api/v1/devices/:id               — Deactivate device

GET    /api/v1/terminals                 — List terminals
POST   /api/v1/terminals                 — Create terminal
GET    /api/v1/terminals/:id             — Get terminal
PUT    /api/v1/terminals/:id             — Update terminal
DELETE /api/v1/terminals/:id             — Deactivate terminal
```

### Product Endpoints

```
GET    /api/v1/products                  — List products (filterable, paginated)
POST   /api/v1/products                  — Create product
GET    /api/v1/products/:id              — Get product
PUT    /api/v1/products/:id              — Update product
DELETE /api/v1/products/:id              — Soft delete product
GET    /api/v1/products/:id/barcodes     — Get product barcodes
POST   /api/v1/products/:id/barcodes     — Add barcode
DELETE /api/v1/products/:id/barcodes/:bid — Remove barcode
GET    /api/v1/products/:id/prices       — Get price history
POST   /api/v1/products/:id/prices       — Set price tier
POST   /api/v1/products/import           — Bulk import
GET    /api/v1/products/export           — Export products

GET    /api/v1/categories                — List categories (tree)
POST   /api/v1/categories                — Create category
PUT    /api/v1/categories/:id            — Update category
DELETE /api/v1/categories/:id            — Delete category
PUT    /api/v1/categories/reorder        — Reorder categories

GET    /api/v1/brands                    — List brands
POST   /api/v1/brands                    — Create brand
PUT    /api/v1/brands/:id                — Update brand
DELETE /api/v1/brands/:id                — Delete brand

GET    /api/v1/units                     — List units
POST   /api/v1/units                     — Create unit
PUT    /api/v1/units/:id                 — Update unit

GET    /api/v1/tax-rates                 — List tax rates
POST   /api/v1/tax-rates                 — Create tax rate
PUT    /api/v1/tax-rates/:id             — Update tax rate
```

### Inventory Endpoints

```
GET    /api/v1/inventory                       — Get stock levels (filterable by branch, product)
GET    /api/v1/inventory/low-stock             — Get low stock items
GET    /api/v1/inventory/out-of-stock          — Get out of stock items
POST   /api/v1/inventory/adjust               — Create stock adjustment
GET    /api/v1/inventory/movements             — Get inventory movements
GET    /api/v1/inventory/valuation             — Get stock valuation

GET    /api/v1/inventory/transfers             — List transfers
POST   /api/v1/inventory/transfers             — Create transfer request
GET    /api/v1/inventory/transfers/:id         — Get transfer
PUT    /api/v1/inventory/transfers/:id         — Update transfer
POST   /api/v1/inventory/transfers/:id/approve — Approve transfer
POST   /api/v1/inventory/transfers/:id/ship    — Mark shipped
POST   /api/v1/inventory/transfers/:id/receive — Mark received
```

### Supplier & Purchase Endpoints

```
GET    /api/v1/suppliers                       — List suppliers
POST   /api/v1/suppliers                       — Create supplier
GET    /api/v1/suppliers/:id                   — Get supplier
PUT    /api/v1/suppliers/:id                   — Update supplier
DELETE /api/v1/suppliers/:id                   — Deactivate supplier
GET    /api/v1/suppliers/:id/payments          — Supplier payment history

GET    /api/v1/purchases                       — List purchase orders
POST   /api/v1/purchases                       — Create PO
GET    /api/v1/purchases/:id                   — Get PO
PUT    /api/v1/purchases/:id                   — Update PO
POST   /api/v1/purchases/:id/approve           — Approve PO
POST   /api/v1/purchases/:id/receive           — Record receiving
POST   /api/v1/purchases/:id/payments          — Record payment
```

### Customer Endpoints

```
GET    /api/v1/customers                       — List customers
POST   /api/v1/customers                       — Create customer
GET    /api/v1/customers/:id                   — Get customer
PUT    /api/v1/customers/:id                   — Update customer
DELETE /api/v1/customers/:id                   — Deactivate customer
GET    /api/v1/customers/:id/transactions      — Customer purchase history
```

### Sales Endpoints

```
GET    /api/v1/sales                           — List sales (filterable)
GET    /api/v1/sales/:id                       — Get sale details
GET    /api/v1/sales/:id/receipt               — Get receipt data
POST   /api/v1/sales/:id/cancel                — Cancel sale

GET    /api/v1/refunds                         — List refunds
POST   /api/v1/refunds                         — Create refund
GET    /api/v1/refunds/:id                     — Get refund details

GET    /api/v1/payments                        — List payments (filterable)
```

### Cash Management Endpoints

```
GET    /api/v1/cash-sessions                   — List sessions
GET    /api/v1/cash-sessions/:id               — Get session details
GET    /api/v1/cash-sessions/:id/movements     — Get session movements

GET    /api/v1/cash-movements                  — List movements

GET    /api/v1/expenses                        — List expenses
POST   /api/v1/expenses                        — Create expense
GET    /api/v1/expenses/:id                    — Get expense
PUT    /api/v1/expenses/:id                    — Update expense
DELETE /api/v1/expenses/:id                    — Delete expense
GET    /api/v1/expense-categories              — List expense categories
POST   /api/v1/expense-categories              — Create expense category
```

### Sync Endpoints

```
POST   /api/v1/sync/upload                     — Upload batch of operations
GET    /api/v1/sync/changes                    — Download changes since checkpoint
GET    /api/v1/sync/status                     — Get sync status for device
GET    /api/v1/sync/conflicts                  — Get unresolved conflicts
POST   /api/v1/sync/conflicts/:id/resolve      — Resolve a conflict
POST   /api/v1/sync/full                       — Request full sync (initial setup)
```

### Report Endpoints

```
GET    /api/v1/reports/sales                   — Sales report (filters: date, branch, cashier, product, category, payment)
GET    /api/v1/reports/profit                  — Profit report
GET    /api/v1/reports/inventory               — Inventory report
GET    /api/v1/reports/cashiers                — Cashier performance report
GET    /api/v1/reports/financial               — Financial summary
GET    /api/v1/reports/dashboard               — Dashboard statistics
GET    /api/v1/reports/export                  — Export report (CSV, Excel, PDF)
```

### Audit & Misc Endpoints

```
GET    /api/v1/audit-logs                      — List audit logs (filterable)
GET    /api/v1/settings                        — Get system settings
PUT    /api/v1/settings                        — Update settings
GET    /api/v1/health                          — Health check (public)
```

### Standard Query Parameters

```
?page=1&per_page=20          — Pagination
?sort=created_at&order=desc  — Sorting
?search=coca                 — Full-text search
?branch_id=xxx               — Branch filter
?from=2026-01-01&to=2026-12-31 — Date range
?status=COMPLETED            — Status filter
```

### Idempotency

All `POST` endpoints that create resources accept an `X-Idempotency-Key` header. The server stores processed keys in `sync_operations` and returns the original result for duplicate requests.

### Rate Limiting

```
General:     100 requests / 15 seconds per IP
Auth:        5 login attempts / 15 minutes per account
Sync Upload: 30 requests / minute per device
Reports:     10 requests / minute per user
```

---

## 16. Electron Architecture

### Process Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  MAIN PROCESS (Node.js)                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ Window Manager                                      │       │
│  │  - Create BrowserWindow (context isolation: ON)     │       │
│  │  - nodeIntegration: OFF                             │       │
│  │  - Content Security Policy                          │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ IPC Router                                          │       │
│  │  - Typed channel definitions                        │       │
│  │  - Input validation on every handler                │       │
│  │  - Permission checking                              │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ Database Service                                    │       │
│  │  - Drizzle ORM + better-sqlite3                     │       │
│  │  - Migration runner                                 │       │
│  │  - Backup manager                                   │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ Business Services                                   │       │
│  │  - SaleService, ProductService, InventoryService    │       │
│  │  - Repositories (ProductRepo, SaleRepo, etc.)       │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ Sync Engine                                         │       │
│  │  - ConnectivityMonitor                              │       │
│  │  - UploadManager                                    │       │
│  │  - DownloadManager                                  │       │
│  │  - ConflictResolver                                 │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ Hardware Services                                   │       │
│  │  - PrinterService (abstracted interface)            │       │
│  │  - CashDrawerService                               │       │
│  │  - BarcodeService (keyboard-wedge detection)        │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ Security                                            │       │
│  │  - AuthService (online + offline)                   │       │
│  │  - CredentialStore (encrypted)                      │       │
│  │  - DeviceIdentity                                   │       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PRELOAD SCRIPT (sandboxed bridge)                             │
│                                                                 │
│  contextBridge.exposeInMainWorld('api', {                      │
│    // Auth                                                      │
│    auth: { login, logout, getSession },                        │
│    // Products                                                  │
│    products: { search, getByBarcode, getById, list, create },  │
│    // Sales                                                     │
│    sales: { create, getById, list, cancel },                   │
│    // Cart                                                      │
│    cart: { hold, getHeld, deleteHeld },                        │
│    // Inventory                                                 │
│    inventory: { getStock, adjust, getMovements },              │
│    // Cash Sessions                                             │
│    cashSessions: { open, close, getCurrent },                  │
│    // Customers                                                 │
│    customers: { search, create, getById },                     │
│    // Sync                                                      │
│    sync: { getStatus, triggerSync, getHistory },               │
│    // Hardware                                                  │
│    hardware: { printReceipt, openDrawer, testPrinter },        │
│    // Settings                                                  │
│    settings: { get, set },                                     │
│    // Backup                                                    │
│    backup: { create, restore, list },                          │
│    // Reports                                                   │
│    reports: { sales, inventory, cashier, financial },          │
│  })                                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  RENDERER PROCESS (React)                                      │
│                                                                 │
│  - NO access to Node.js APIs                                   │
│  - NO access to filesystem                                      │
│  - NO access to SQLite                                          │
│  - Communicates ONLY via window.api (preload bridge)           │
│  - React components, Zustand stores, TanStack Query            │
│  - Tailwind CSS for styling                                     │
│  - i18n for Arabic/English                                      │
│                                                                 │
│  Screens:                                                       │
│    - Login                                                      │
│    - POS (main cashier screen)                                  │
│    - Local Admin (products, inventory, reports, etc.)          │
│    - Settings                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### BrowserWindow Security Configuration

```typescript
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,        // CRITICAL: No Node.js in renderer
    contextIsolation: true,        // CRITICAL: Separate contexts
    sandbox: true,                 // Additional sandboxing
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: true,             // Enforce same-origin
    allowRunningInsecureContent: false,
  },
});

// Content Security Policy
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:;"
      ],
    },
  });
});
```

---

## 17. Admin Dashboard

### Cloud Admin Dashboard — Complete Page List

```
1.  Dashboard (Overview)
    - Sales summary cards (today, week, month)
    - Transaction count
    - Gross profit
    - Active cashiers / open shifts
    - Terminal status (online/offline)
    - Pending/failed sync count
    - Charts: sales trend, sales by branch, payment methods, top products
    - Low stock alerts
    - Global branch selector
    - Date range filter

2.  POS Management
    2.1  Terminals — List, status, last seen, last sync, register new
    2.2  Cashiers — List, create, edit, enable/disable, reset password, view activity
    2.3  Active Sessions — Currently open shifts across branches
    2.4  Shift History — Closed shifts with cash reconciliation

3.  Products
    3.1  Product List — CRUD, bulk import/export, search, filter by category/brand/status
    3.2  Product Detail — All fields, barcodes, prices, stock levels per branch
    3.3  Categories — Tree view, CRUD, reorder, assign products
    3.4  Brands — CRUD
    3.5  Units — CRUD
    3.6  Barcode Management — Multiple barcodes per product, generate, print
    3.7  Pricing — Price tiers, branch-specific, promotional, history

4.  Inventory
    4.1  Stock Levels — Current stock per product per branch, search, filter
    4.2  Stock Movements — Movement log with filters (type, product, branch, date)
    4.3  Stock Adjustments — Create adjustment with reason
    4.4  Stock Transfers — Request, approve, ship, receive workflow
    4.5  Stock Count — Initiate count, record counts, reconcile
    4.6  Low Stock Alerts — Configurable thresholds
    4.7  Stock Valuation — Total inventory value by branch

5.  Purchasing
    5.1  Suppliers — CRUD, balance, payment history
    5.2  Purchase Orders — Create, approve, receive (partial), view history
    5.3  Receiving — Record received goods against POs
    5.4  Supplier Payments — Record payments, view balance

6.  Sales
    6.1  All Sales — List with comprehensive filters (date, branch, cashier, terminal, customer, status, sync status)
    6.2  Sale Detail — Full invoice view with items, payments, audit history
    6.3  Invoices — Print/reprint, export
    6.4  Returns — Create return against original sale
    6.5  Refunds — Process refund, track refund history

7.  Customers
    7.1  Customer List — Search, filter, CRUD
    7.2  Customer Detail — Purchase history, spending, loyalty points, credit balance
    7.3  Loyalty — Points management (if enabled)

8.  Finance
    8.1  Expenses — List, create, categorize, filter by branch/date/category
    8.2  Expense Categories — CRUD
    8.3  Payments Overview — All payment transactions
    8.4  Cash Flow — Inflows vs outflows
    8.5  Cash Sessions — All shift records with reconciliation

9.  Reports
    9.1  Sales Reports — Daily/weekly/monthly, by branch/cashier/product/category/payment method
    9.2  Profit Reports — Revenue, cost, gross profit, margin
    9.3  Inventory Reports — Stock levels, movement, valuation, dead stock, damaged
    9.4  Cashier Reports — Sales per cashier, shift performance, cash differences, discounts given
    9.5  Financial Reports — Revenue, expenses, cash flow, P&L
    9.6  Custom Reports — Configurable filters, save report templates
    9.7  Export — CSV, Excel, PDF

10. Sync Center
    10.1 Status — Overall sync health per device
    10.2 Pending — Operations awaiting sync
    10.3 Failed — Failed operations with error details, retry actions
    10.4 Conflicts — Unresolved conflicts with resolution options
    10.5 History — Complete sync log

11. Users & Security
    11.1 Users — CRUD, assign roles/branches, enable/disable, lock/unlock
    11.2 Roles — View system roles, CRUD custom roles, assign permissions
    11.3 Permissions — View all permissions grouped by module
    11.4 Devices — Registered devices, status, revoke access
    11.5 Audit Logs — Searchable audit trail with filters

12. Settings
    12.1 Company — Name, logo, contact, tax number, currency
    12.2 Branches — Branch details, address, contact
    12.3 POS Settings — Default behaviors, negative inventory, payment methods
    12.4 Receipt — Template configuration, header, footer, logo
    12.5 Tax — Tax rates, inclusive/exclusive mode
    12.6 Currency — Currency code, symbol, decimal places
    12.7 Sync — Sync intervals, retry settings, offline policy
    12.8 System — Backup schedule, data retention, notifications
```

### Local Admin (Electron) — Page List

```
1.  Dashboard — Local sales summary, stock alerts, sync status
2.  POS — Full cashier interface (described in §18)
3.  Products — View, create, edit (synced to cloud when online)
4.  Categories — View, create, edit
5.  Inventory — Stock levels, adjustments, movements
6.  Customers — View, create, edit
7.  Sales — View local sales history, reprint receipts
8.  Cashier Shifts — Open/close, view history
9.  Expenses — Create, view
10. Reports — Local sales, inventory, cashier reports
11. Sync Center — Status, pending, failed, manual sync trigger
12. Backup — Create, restore, view history
13. Settings — Local POS settings, printer, receipt, locale
```

---

## 18. POS Features

### Complete POS Feature List

```
SCANNING & SEARCH
- USB barcode scanner support (keyboard-wedge mode)
- Manual barcode entry
- Product search by name (Arabic/English)
- Product search by SKU
- Quick product grid (favorites/frequent)
- Multiple barcodes per product

CART MANAGEMENT
- Add product (scan or search)
- Remove product
- Change quantity (increment/decrement/manual entry)
- Weighted product entry (manual weight input)
- Line-item discount (percentage or fixed)
- Invoice-level discount (percentage or fixed)
- Clear cart
- Hold cart (park order)
- Resume held cart
- List held carts
- Delete held cart
- Cart item notes

CUSTOMER
- Attach customer to sale
- Quick customer search (name/phone)
- Create new customer inline
- View customer balance/loyalty

PAYMENT
- Cash payment (amount tendered, change calculated)
- Card payment (with reference)
- Bank transfer (with reference)
- Wallet/other configurable methods
- Split payment (multiple methods)
- Full payment validation (total must be covered)

SALE COMPLETION
- Atomic transaction (sale + items + payment + inventory)
- Invoice number generation (branch-specific sequence)
- Print receipt (thermal printer)
- Receipt preview
- Email receipt (when online, optional)
- Open cash drawer

RETURNS & REFUNDS (with permission)
- Lookup original sale by invoice number
- Full return
- Partial return (select items/quantities)
- Refund to original payment method or cash
- Inventory restoration

CASH SESSION
- Open shift with opening cash amount
- View current session summary
- Record cash deposit (e.g., start-of-day float)
- Record cash withdrawal
- Record expense
- Close shift with cash count
- Calculate expected vs actual cash
- Record discrepancy

STATUS INDICATORS
- Online/Offline indicator
- Sync status indicator (pending count)
- Printer status
- Active session info (cashier name, terminal)
- Current date/time

KEYBOARD SHORTCUTS
- F1: Search product
- F2: Hold cart
- F3: Resume held cart
- F4: Clear cart
- F5: Customer
- F6: Discount
- F8: Payment
- F10: Print last receipt
- F12: Lock screen
- ESC: Cancel current action
```

---

## 19. Folder Structure

```
supermarket-pos/
│
├── README.md
├── package.json                  — Root workspace config (pnpm workspaces)
├── pnpm-workspace.yaml
├── turbo.json                    — Turborepo config (optional, for build orchestration)
├── docker-compose.yml            — Backend services
├── .env.example
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
│
├── packages/
│   └── shared/                   — Shared types, constants, utilities
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types/
│           │   ├── index.ts
│           │   ├── product.ts
│           │   ├── sale.ts
│           │   ├── inventory.ts
│           │   ├── user.ts
│           │   ├── sync.ts
│           │   ├── payment.ts
│           │   └── ...
│           ├── constants/
│           │   ├── permissions.ts
│           │   ├── roles.ts
│           │   ├── sync-status.ts
│           │   ├── sale-status.ts
│           │   └── ...
│           ├── utils/
│           │   ├── money.ts          — Integer money arithmetic
│           │   ├── tax.ts            — Tax calculations
│           │   ├── ulid.ts           — ULID generation
│           │   ├── validation.ts     — Shared validators (Zod schemas)
│           │   └── date.ts           — Date formatting
│           └── i18n/
│               ├── ar.json
│               └── en.json
│
├── apps/
│   ├── desktop/                  — Electron application
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── electron-builder.yml  — Build & packaging config
│   │   │
│   │   ├── src/
│   │   │   ├── main/             — Electron Main Process
│   │   │   │   ├── index.ts      — Entry point
│   │   │   │   ├── window.ts     — Window manager
│   │   │   │   ├── ipc/
│   │   │   │   │   ├── router.ts         — IPC channel registry
│   │   │   │   │   ├── auth.ipc.ts
│   │   │   │   │   ├── products.ipc.ts
│   │   │   │   │   ├── sales.ipc.ts
│   │   │   │   │   ├── inventory.ipc.ts
│   │   │   │   │   ├── customers.ipc.ts
│   │   │   │   │   ├── cash-sessions.ipc.ts
│   │   │   │   │   ├── sync.ipc.ts
│   │   │   │   │   ├── hardware.ipc.ts
│   │   │   │   │   ├── backup.ipc.ts
│   │   │   │   │   ├── settings.ipc.ts
│   │   │   │   │   └── reports.ipc.ts
│   │   │   │   │
│   │   │   │   ├── database/
│   │   │   │   │   ├── connection.ts     — SQLite connection manager
│   │   │   │   │   ├── schema/           — Drizzle schema definitions
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── products.ts
│   │   │   │   │   │   ├── sales.ts
│   │   │   │   │   │   ├── inventory.ts
│   │   │   │   │   │   ├── users.ts
│   │   │   │   │   │   ├── sync.ts
│   │   │   │   │   │   ├── cash.ts
│   │   │   │   │   │   ├── customers.ts
│   │   │   │   │   │   ├── settings.ts
│   │   │   │   │   │   └── audit.ts
│   │   │   │   │   └── migrations/       — SQLite migrations
│   │   │   │   │       ├── 0001_initial.ts
│   │   │   │   │       └── ...
│   │   │   │   │
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── product.repository.ts
│   │   │   │   │   ├── sale.repository.ts
│   │   │   │   │   ├── inventory.repository.ts
│   │   │   │   │   ├── customer.repository.ts
│   │   │   │   │   ├── user.repository.ts
│   │   │   │   │   ├── cash-session.repository.ts
│   │   │   │   │   ├── expense.repository.ts
│   │   │   │   │   ├── sync.repository.ts
│   │   │   │   │   ├── settings.repository.ts
│   │   │   │   │   ├── audit.repository.ts
│   │   │   │   │   └── backup.repository.ts
│   │   │   │   │
│   │   │   │   ├── services/
│   │   │   │   │   ├── auth.service.ts       — Online + offline auth
│   │   │   │   │   ├── product.service.ts
│   │   │   │   │   ├── sale.service.ts       — Sale creation (atomic)
│   │   │   │   │   ├── inventory.service.ts
│   │   │   │   │   ├── customer.service.ts
│   │   │   │   │   ├── cash-session.service.ts
│   │   │   │   │   ├── expense.service.ts
│   │   │   │   │   ├── report.service.ts
│   │   │   │   │   ├── backup.service.ts
│   │   │   │   │   └── device.service.ts
│   │   │   │   │
│   │   │   │   ├── sync/
│   │   │   │   │   ├── sync-engine.ts        — Main orchestrator
│   │   │   │   │   ├── connectivity.ts       — Network detection
│   │   │   │   │   ├── upload-manager.ts
│   │   │   │   │   ├── download-manager.ts
│   │   │   │   │   ├── conflict-resolver.ts
│   │   │   │   │   └── sync-api-client.ts    — HTTP client for sync endpoints
│   │   │   │   │
│   │   │   │   ├── hardware/
│   │   │   │   │   ├── printer.service.ts    — Thermal receipt printing
│   │   │   │   │   ├── cash-drawer.service.ts
│   │   │   │   │   └── barcode.service.ts    — Barcode generation/printing
│   │   │   │   │
│   │   │   │   └── security/
│   │   │   │       ├── credential-store.ts   — Encrypted storage
│   │   │   │       ├── device-identity.ts    — Hardware-derived ID
│   │   │   │       └── session-manager.ts
│   │   │   │
│   │   │   ├── preload/
│   │   │   │   ├── index.ts              — contextBridge.exposeInMainWorld
│   │   │   │   └── api.d.ts             — Type declarations for window.api
│   │   │   │
│   │   │   └── renderer/                — React Application
│   │   │       ├── index.html
│   │   │       ├── main.tsx             — React entry point
│   │   │       ├── App.tsx              — Root component + router
│   │   │       │
│   │   │       ├── assets/
│   │   │       │   ├── fonts/
│   │   │       │   └── images/
│   │   │       │
│   │   │       ├── styles/
│   │   │       │   ├── globals.css       — Tailwind directives + global styles
│   │   │       │   └── tailwind.config.ts
│   │   │       │
│   │   │       ├── hooks/
│   │   │       │   ├── useAuth.ts
│   │   │       │   ├── useProducts.ts
│   │   │       │   ├── useCart.ts
│   │   │       │   ├── useSync.ts
│   │   │       │   ├── usePermission.ts
│   │   │       │   ├── useKeyboardShortcuts.ts
│   │   │       │   └── useI18n.ts
│   │   │       │
│   │   │       ├── stores/
│   │   │       │   ├── auth.store.ts
│   │   │       │   ├── cart.store.ts
│   │   │       │   ├── pos.store.ts
│   │   │       │   ├── sync.store.ts
│   │   │       │   └── settings.store.ts
│   │   │       │
│   │   │       ├── components/
│   │   │       │   ├── ui/               — Base UI components
│   │   │       │   │   ├── Button.tsx
│   │   │       │   │   ├── Input.tsx
│   │   │       │   │   ├── Modal.tsx
│   │   │       │   │   ├── Drawer.tsx
│   │   │       │   │   ├── DataTable.tsx
│   │   │       │   │   ├── SearchInput.tsx
│   │   │       │   │   ├── MoneyInput.tsx
│   │   │       │   │   ├── DateRangePicker.tsx
│   │   │       │   │   ├── StatusBadge.tsx
│   │   │       │   │   ├── ConfirmDialog.tsx
│   │   │       │   │   ├── Pagination.tsx
│   │   │       │   │   ├── EmptyState.tsx
│   │   │       │   │   ├── LoadingState.tsx
│   │   │       │   │   ├── ErrorState.tsx
│   │   │       │   │   ├── StatsCard.tsx
│   │   │       │   │   ├── Chart.tsx
│   │   │       │   │   └── PermissionGuard.tsx
│   │   │       │   │
│   │   │       │   ├── pos/              — POS-specific components
│   │   │       │   │   ├── BarcodeScannerInput.tsx
│   │   │       │   │   ├── ProductSearch.tsx
│   │   │       │   │   ├── ProductGrid.tsx
│   │   │       │   │   ├── Cart.tsx
│   │   │       │   │   ├── CartItem.tsx
│   │   │       │   │   ├── QuantityControl.tsx
│   │   │       │   │   ├── DiscountInput.tsx
│   │   │       │   │   ├── CustomerSelector.tsx
│   │   │       │   │   ├── PaymentModal.tsx
│   │   │       │   │   ├── CashPayment.tsx
│   │   │       │   │   ├── SplitPayment.tsx
│   │   │       │   │   ├── ReceiptPreview.tsx
│   │   │       │   │   ├── HeldOrders.tsx
│   │   │       │   │   ├── ShiftPanel.tsx
│   │   │       │   │   ├── OfflineIndicator.tsx
│   │   │       │   │   └── SyncIndicator.tsx
│   │   │       │   │
│   │   │       │   ├── admin/            — Local Admin components
│   │   │       │   │   ├── ProductForm.tsx
│   │   │       │   │   ├── CategoryTree.tsx
│   │   │       │   │   ├── InventoryTable.tsx
│   │   │       │   │   ├── SalesTable.tsx
│   │   │       │   │   ├── CustomerForm.tsx
│   │   │       │   │   ├── ExpenseForm.tsx
│   │   │       │   │   ├── BackupManager.tsx
│   │   │       │   │   └── SyncCenter.tsx
│   │   │       │   │
│   │   │       │   └── layout/
│   │   │       │       ├── AppLayout.tsx
│   │   │       │       ├── Sidebar.tsx
│   │   │       │       ├── Header.tsx
│   │   │       │       └── StatusBar.tsx
│   │   │       │
│   │   │       ├── pages/
│   │   │       │   ├── Login.tsx
│   │   │       │   ├── POS.tsx
│   │   │       │   ├── admin/
│   │   │       │   │   ├── Dashboard.tsx
│   │   │       │   │   ├── Products.tsx
│   │   │       │   │   ├── ProductDetail.tsx
│   │   │       │   │   ├── Categories.tsx
│   │   │       │   │   ├── Inventory.tsx
│   │   │       │   │   ├── InventoryMovements.tsx
│   │   │       │   │   ├── Customers.tsx
│   │   │       │   │   ├── Sales.tsx
│   │   │       │   │   ├── SaleDetail.tsx
│   │   │       │   │   ├── CashSessions.tsx
│   │   │       │   │   ├── Expenses.tsx
│   │   │       │   │   ├── Reports.tsx
│   │   │       │   │   ├── SyncCenter.tsx
│   │   │       │   │   ├── Backup.tsx
│   │   │       │   │   └── Settings.tsx
│   │   │       │   └── NotFound.tsx
│   │   │       │
│   │   │       └── lib/
│   │   │           ├── api.ts            — window.api wrapper with types
│   │   │           ├── formatters.ts     — Money, date, number formatters
│   │   │           └── receipt.ts        — Receipt template engine
│   │   │
│   │   └── tests/
│   │       ├── unit/
│   │       │   ├── money.test.ts
│   │       │   ├── tax.test.ts
│   │       │   ├── cart.test.ts
│   │       │   ├── sale.service.test.ts
│   │       │   ├── inventory.service.test.ts
│   │       │   └── sync.test.ts
│   │       ├── integration/
│   │       │   ├── sale-flow.test.ts
│   │       │   ├── offline-auth.test.ts
│   │       │   ├── sync-engine.test.ts
│   │       │   └── backup-restore.test.ts
│   │       └── e2e/
│   │           ├── pos-flow.spec.ts
│   │           ├── offline-sale.spec.ts
│   │           └── sync-recovery.spec.ts
│   │
│   ├── backend/                  — NestJS Cloud Backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │
│   │   ├── src/
│   │   │   ├── main.ts              — Fastify bootstrap
│   │   │   ├── app.module.ts        — Root module
│   │   │   │
│   │   │   ├── config/
│   │   │   │   ├── database.config.ts
│   │   │   │   ├── auth.config.ts
│   │   │   │   ├── redis.config.ts
│   │   │   │   └── app.config.ts
│   │   │   │
│   │   │   ├── database/
│   │   │   │   ├── connection.ts
│   │   │   │   ├── schema/           — Drizzle PostgreSQL schema
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── companies.ts
│   │   │   │   │   ├── branches.ts
│   │   │   │   │   ├── users.ts
│   │   │   │   │   ├── products.ts
│   │   │   │   │   ├── inventory.ts
│   │   │   │   │   ├── sales.ts
│   │   │   │   │   ├── customers.ts
│   │   │   │   │   ├── suppliers.ts
│   │   │   │   │   ├── purchases.ts
│   │   │   │   │   ├── cash.ts
│   │   │   │   │   ├── sync.ts
│   │   │   │   │   ├── audit.ts
│   │   │   │   │   └── reports.ts
│   │   │   │   ├── migrations/
│   │   │   │   │   ├── 0001_initial.ts
│   │   │   │   │   └── ...
│   │   │   │   └── seed/
│   │   │   │       ├── seed.ts
│   │   │   │       ├── permissions.seed.ts
│   │   │   │       ├── roles.seed.ts
│   │   │   │       └── demo-data.seed.ts
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts
│   │   │   │   │   ├── company.guard.ts
│   │   │   │   │   ├── permission.guard.ts
│   │   │   │   │   └── device.guard.ts
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── require-permission.decorator.ts
│   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   └── company-id.decorator.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── audit.interceptor.ts
│   │   │   │   │   └── transform.interceptor.ts
│   │   │   │   ├── filters/
│   │   │   │   │   └── global-exception.filter.ts
│   │   │   │   ├── pipes/
│   │   │   │   │   └── validation.pipe.ts
│   │   │   │   └── middleware/
│   │   │   │       └── rate-limit.middleware.ts
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   └── dto/
│   │   │   │   │
│   │   │   │   ├── companies/
│   │   │   │   │   ├── companies.module.ts
│   │   │   │   │   ├── companies.controller.ts
│   │   │   │   │   ├── companies.service.ts
│   │   │   │   │   ├── companies.repository.ts
│   │   │   │   │   └── dto/
│   │   │   │   │
│   │   │   │   ├── branches/
│   │   │   │   ├── users/
│   │   │   │   ├── roles/
│   │   │   │   ├── devices/
│   │   │   │   ├── terminals/
│   │   │   │   ├── products/
│   │   │   │   ├── categories/
│   │   │   │   ├── brands/
│   │   │   │   ├── units/
│   │   │   │   ├── inventory/
│   │   │   │   ├── suppliers/
│   │   │   │   ├── purchases/
│   │   │   │   ├── customers/
│   │   │   │   ├── sales/
│   │   │   │   ├── refunds/
│   │   │   │   ├── cash-sessions/
│   │   │   │   ├── expenses/
│   │   │   │   ├── sync/
│   │   │   │   │   ├── sync.module.ts
│   │   │   │   │   ├── sync.controller.ts
│   │   │   │   │   ├── sync.service.ts
│   │   │   │   │   ├── sync.repository.ts
│   │   │   │   │   └── conflict.service.ts
│   │   │   │   ├── reports/
│   │   │   │   ├── audit/
│   │   │   │   ├── settings/
│   │   │   │   ├── notifications/
│   │   │   │   └── websocket/
│   │   │   │       ├── ws.gateway.ts
│   │   │   │       └── ws.module.ts
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── pagination.ts
│   │   │       └── query-builder.ts
│   │   │
│   │   └── tests/
│   │       ├── unit/
│   │       ├── integration/
│   │       └── e2e/
│   │
│   └── admin-web/                — Cloud Admin Dashboard (React)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       │
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── styles/
│       │   ├── hooks/
│       │   ├── stores/
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   ├── dashboard/
│       │   │   ├── products/
│       │   │   ├── inventory/
│       │   │   ├── sales/
│       │   │   ├── customers/
│       │   │   ├── suppliers/
│       │   │   ├── finance/
│       │   │   ├── reports/
│       │   │   ├── sync/
│       │   │   ├── users/
│       │   │   ├── settings/
│       │   │   └── layout/
│       │   ├── pages/
│       │   ├── services/          — API client
│       │   │   └── api.ts
│       │   └── lib/
│       │
│       └── tests/
│
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.admin
│   │   └── nginx/
│   │       └── nginx.conf
│   ├── scripts/
│   │   ├── deploy.sh
│   │   ├── backup-db.sh
│   │   └── seed.sh
│   └── k8s/                      — (future) Kubernetes manifests
│
└── docs/
    ├── architecture.md
    ├── database.md
    ├── api.md
    ├── sync-engine.md
    ├── offline-mode.md
    ├── security.md
    ├── deployment.md
    ├── testing.md
    ├── backup.md
    ├── troubleshooting.md
    └── setup.md
```

---

## 20. Development Phases

### Phase Dependency Graph

```mermaid
graph LR
    P0["Phase 0<br/>Architecture"] --> P1["Phase 1<br/>Foundation"]
    P1 --> P2["Phase 2<br/>Database"]
    P2 --> P3["Phase 3<br/>Auth & RBAC"]
    P2 --> P5["Phase 5<br/>Products"]
    P3 --> P4["Phase 4<br/>Company/Branch"]
    P3 --> P6["Phase 6<br/>Offline Foundation"]
    P5 --> P7["Phase 7<br/>POS"]
    P6 --> P7
    P4 --> P7
    P7 --> P8["Phase 8<br/>Sales & Inventory"]
    P8 --> P9["Phase 9<br/>Purchases"]
    P8 --> P10["Phase 10<br/>Customers"]
    P8 --> P11["Phase 11<br/>Returns"]
    P8 --> P12["Phase 12<br/>Expenses"]
    P8 --> P13["Phase 13<br/>Sync Engine"]
    P13 --> P14["Phase 14<br/>Cloud Admin"]
    P14 --> P15["Phase 15<br/>Reports"]
    P13 --> P16["Phase 16<br/>Backup"]
    P7 --> P17["Phase 17<br/>Hardware"]
    P14 --> P18["Phase 18<br/>Security Audit"]
    P18 --> P19["Phase 19<br/>Testing"]
    P19 --> P20["Phase 20<br/>Deployment"]
```

---

### PHASE 0 — Requirements & Architecture

**Objective:** Finalize all architectural decisions before any code is written.

**Deliverables:**
1. This architecture document (approved)
2. Database ERD (textual + diagram)
3. API specification
4. Sync engine design
5. Security architecture
6. Folder structure
7. Phase plan with dependencies

**Definition of Done:** Architecture document reviewed and approved. No ambiguity in sync strategy, conflict resolution, or offline behavior.

---

### PHASE 1 — Monorepo & Project Foundation

**Objective:** Set up the complete development environment and project scaffolding.

**Features:**
- pnpm monorepo workspace with three apps (desktop, backend, admin-web) + shared package
- TypeScript configuration (strict mode) across all packages
- Electron boilerplate with secure BrowserWindow
- React + Vite setup in Electron renderer
- Tailwind CSS with RTL support and design tokens
- NestJS + Fastify bootstrap
- Docker Compose for PostgreSQL + Redis
- ESLint + Prettier configuration
- Vitest setup
- Git hooks (Husky + lint-staged)
- Environment variable management (.env files, validation)

**Database changes:** None (schemas in Phase 2)
**Backend tasks:** NestJS project scaffolding, Fastify adapter, health endpoint
**Frontend tasks:** React + Tailwind boilerplate, router setup, basic layout
**Electron tasks:** Main process, preload script, context isolation, secure window config
**Local DB tasks:** None
**Sync tasks:** None
**Security tasks:** Context isolation, CSP headers, nodeIntegration: false
**Tests:** Build passes, dev server starts, Electron launches
**Dependencies:** Phase 0 approved
**Deliverables:** Running dev environment (Electron + backend + admin web)
**Definition of Done:**
- `pnpm dev` starts all three apps
- Electron opens with React rendered
- Backend responds to `/api/v1/health`
- Admin web loads in browser
- All linting passes
- Docker Compose starts PostgreSQL + Redis

---

### PHASE 2 — Database & Migrations

**Objective:** Implement both database schemas with migration infrastructure.

**Features:**
- Drizzle schema definitions for SQLite (all tables from §14)
- Drizzle schema definitions for PostgreSQL (all tables from §14)
- Migration system for SQLite (run on Electron start)
- Migration system for PostgreSQL (run on backend start)
- Seed data: default permissions, system roles, demo company/branch
- Shared types generated from schema

**Database changes:** All tables created
**Backend tasks:** PostgreSQL connection, migration runner, seed script
**Frontend tasks:** None
**Electron tasks:** SQLite connection via better-sqlite3, migration runner on startup
**Local DB tasks:** All SQLite tables, indexes, and initial migration
**Sync tasks:** sync_queue, sync_log, sync_checkpoints tables
**Security tasks:** None
**Tests:**
- Migration up/down works for both DBs
- Seed data inserts correctly
- Schema matches ERD
**Dependencies:** Phase 1
**Deliverables:** Both databases fully schema'd with migration infrastructure
**Definition of Done:**
- `pnpm db:migrate` runs PostgreSQL migrations
- Electron startup runs SQLite migrations
- Seed data populates correctly
- All tables and indexes exist
- Rollback migrations work

---

### PHASE 3 — Authentication & RBAC

**Objective:** Implement secure authentication for both online and offline scenarios, plus complete RBAC.

**Features:**
- Online login (username + password → JWT + refresh token)
- Password hashing (argon2id)
- JWT issuance + validation
- Refresh token rotation
- Logout (token blacklist via Redis)
- Session management
- Account lockout after failed attempts
- Offline authentication (cached verifiers, argon2id local comparison)
- Offline credential expiration
- Permission definitions seeded in DB
- Role definitions (system roles)
- Custom role CRUD
- `@RequirePermission()` decorator
- AuthGuard, CompanyGuard, PermissionGuard
- Login attempt tracking
- Device authentication

**Database changes:** Users table populated, roles/permissions seeded
**Backend tasks:** AuthModule, JwtStrategy, guards, user CRUD
**Frontend tasks:** Login page, auth store, PermissionGuard component, protected routes
**Electron tasks:** Offline auth service, credential store, local session manager, device identity
**Local DB tasks:** local_users, local_sessions tables populated
**Sync tasks:** None yet (but local_users data structure ready for sync)
**Security tasks:** Argon2id hashing, JWT configuration, refresh token security, rate limiting on login
**Tests:**
- Login with valid credentials → JWT returned
- Login with invalid credentials → error
- Expired JWT → 401
- Refresh token → new JWT
- Account lockout after N attempts
- Offline login with cached credentials
- Offline login with expired credentials → rejected
- Permission check blocks unauthorized access
- PermissionGuard hides UI elements
**Dependencies:** Phase 2
**Deliverables:** Working auth flow (online + offline), RBAC enforcement
**Definition of Done:**
- Users can log in online, receive JWT
- Users can log in offline with cached credentials
- Unauthorized API calls return 403
- Frontend hides unauthorized features
- Account lockout works
- Refresh token rotation works

---

### PHASE 4 — Company / Branch / Terminal Management

**Objective:** Implement multi-company, multi-branch, and terminal management.

**Features:**
- Company CRUD (super admin)
- Company settings
- Branch CRUD (company admin)
- Branch settings
- POS terminal registration
- Device registration and binding
- User-branch assignment
- Global branch selector in admin
- Company-scoped data isolation

**Database changes:** companies, branches, devices, pos_terminals, user_branches populated
**Backend tasks:** CompanyModule, BranchModule, DeviceModule, TerminalModule
**Frontend tasks:** Branch selector component, company/branch management pages (admin web)
**Electron tasks:** Device registration flow, local_device table population
**Local DB tasks:** local_device table populated on registration
**Sync tasks:** None
**Security tasks:** CompanyGuard enforcement on all endpoints
**Tests:**
- Company A cannot access Company B data
- User sees only authorized branches
- Device registration creates terminal
- Branch selector filters all queries
**Dependencies:** Phase 3
**Deliverables:** Multi-tenant infrastructure, device registration
**Definition of Done:**
- Companies are isolated
- Branches are manageable
- Devices can register with a company/branch
- Branch selector works across all admin pages

---

### PHASE 5 — Products

**Objective:** Complete product catalog management.

**Features:**
- Product CRUD with all fields (Arabic/English names, SKU, type, etc.)
- Multiple barcodes per product
- Category management (tree structure)
- Brand management
- Unit management
- Tax rate management
- Product pricing (retail, wholesale, promotional, branch-specific)
- Price history tracking
- Product search (name, SKU, barcode)
- Product import/export (CSV)
- Product status (active/inactive)
- Soft delete

**Database changes:** Products, product_barcodes, categories, brands, units, tax_rates, product_prices, price_history
**Backend tasks:** ProductModule, CategoryModule, BrandModule, UnitModule, TaxRateModule
**Frontend tasks:** Product list, product form, category tree, brand/unit/tax management, search
**Electron tasks:** Local product repository, barcode lookup, product search
**Local DB tasks:** Products + related tables with indexes
**Sync tasks:** None (products synced in Phase 13, but structure ready)
**Security tasks:** Permission checks on CRUD operations
**Tests:**
- CRUD operations for all entities
- Barcode uniqueness enforced
- Category tree ordering
- Price history recorded on price change
- Product search returns correct results
- Bulk import validates data
**Dependencies:** Phase 2 (schema), Phase 3 (auth)
**Deliverables:** Full product catalog management
**Definition of Done:**
- All product fields manageable
- Multiple barcodes per product
- Categories nested correctly
- Price changes audited
- Search works locally (barcode, name, SKU)

---

### PHASE 6 — Local Offline Foundation

**Objective:** Establish the complete offline operation infrastructure in Electron.

**Features:**
- All local repositories implemented (product, sale, inventory, customer, etc.)
- SQLite transaction wrapper with error handling
- Local settings management
- Connectivity monitor (online/offline/unstable/server_down)
- Offline mode indicator in UI
- Local data bootstrap (initial sync data download)
- Device identity management
- IPC channel registry with type safety
- Local audit logging
- Error recovery (crash safety)

**Database changes:** None (all tables from Phase 2)
**Backend tasks:** Initial sync endpoint (full data download for new device)
**Frontend tasks:** Offline indicator, connectivity status display
**Electron tasks:** All repositories, transaction management, connectivity monitor, IPC router
**Local DB tasks:** Verify all tables work with repositories, WAL mode enabled
**Sync tasks:** Connectivity detection, sync status tracking
**Security tasks:** IPC validation, permission checking in main process
**Tests:**
- Repositories correctly read/write SQLite
- Transactions roll back on error
- Connectivity monitor detects state changes
- Application handles SQLite lock gracefully
- Data survives application restart
**Dependencies:** Phase 3 (auth), Phase 5 (product schema)
**Deliverables:** Fully functional offline infrastructure
**Definition of Done:**
- All repositories work with SQLite
- Transactions are atomic
- Connectivity is detected correctly
- Application recovers from crashes
- IPC channels are typed and validated

---

### PHASE 7 — POS / Cashier

**Objective:** Build the complete POS cashier interface.

**Features:**
- Barcode scanner input (keyboard-wedge mode)
- Product search (barcode, name, SKU)
- Cart management (add, remove, quantity, clear)
- Line-item discount
- Invoice-level discount
- Customer attachment
- Cash payment (tendered amount, change calculation)
- Sale completion (atomic SQLite transaction)
- Invoice number generation
- Receipt preview
- Hold cart / resume cart
- Keyboard shortcuts (F-keys)
- Quick product grid
- POS layout (search bar, results, cart, totals, action buttons)
- Status bar (cashier, terminal, session, sync, connectivity)

**Database changes:** None
**Backend tasks:** None (POS is entirely local-first)
**Frontend tasks:** All POS components (§83), POS page, cart store
**Electron tasks:** Sale service, cart hold/resume, invoice numbering
**Local DB tasks:** Sale creation transaction (sale + items + payment + inventory + movement + sync_queue)
**Sync tasks:** Sales added to sync_queue on creation
**Security tasks:** Permission checks (sales.create, sales.discount)
**Tests:**
- Scan barcode → product found → added to cart
- Quantity change updates totals correctly
- Discount calculations correct (percentage + fixed)
- Tax calculations correct
- Split payment covers total
- Cash change calculated correctly
- Sale transaction is atomic (all-or-nothing)
- Held cart persists and resumes
- Receipt shows correct data
- Sale works with no Internet
**Dependencies:** Phase 5 (products), Phase 6 (offline foundation)
**Deliverables:** Fully functional POS
**Definition of Done:**
- Cashier can scan → sell → pay → print receipt
- All calculations use integer arithmetic
- Sale transaction is atomic
- Cart can be held and resumed
- Works entirely offline
- Keyboard shortcuts functional

---

### PHASE 8 — Sales & Inventory

**Objective:** Complete sales management and inventory tracking.

**Features:**
- Sales list with filters (date, cashier, terminal, status, payment method)
- Sale detail view
- Sale cancellation
- Inventory levels per product per branch
- Inventory movements log
- Stock adjustments with reason
- Low stock detection
- Out of stock detection
- Negative inventory policy (configurable)
- Inventory movement on sale/return/adjustment
- Cash session management (open, close, reconcile)
- Cash movement tracking

**Database changes:** None (tables exist)
**Backend tasks:** SalesModule, InventoryModule, CashSessionModule
**Frontend tasks:** Sales list, sale detail, inventory views, cash session UI
**Electron tasks:** Inventory service, cash session service, movement tracking
**Local DB tasks:** Inventory queries, stock level updates
**Sync tasks:** Inventory movements queued for sync
**Security tasks:** Permission checks (inventory.adjust, cash_sessions.open/close)
**Tests:**
- Sale creates correct inventory movements
- Stock decrements on sale
- Stock increments on adjustment
- Low stock alert triggers at threshold
- Negative inventory blocked when policy disabled
- Cash session opening/closing calculates difference
- Cash movements are tracked correctly
**Dependencies:** Phase 7 (POS creates sales)
**Deliverables:** Complete sales + inventory + cash session management
**Definition of Done:**
- Sales viewable with all filters
- Inventory accurately tracks stock
- Cash sessions open/close with reconciliation
- All movements audited

---

### PHASE 9 — Purchases & Suppliers

**Objective:** Implement supplier and purchase order management.

**Features:**
- Supplier CRUD
- Purchase order lifecycle (draft → submit → approve → receive → complete)
- Partial receiving
- Purchase order items
- Supplier payment recording
- Supplier balance tracking
- Inventory update on receiving
- Purchase history

**Database changes:** None (tables exist)
**Backend tasks:** SupplierModule, PurchaseModule
**Frontend tasks:** Supplier management, PO creation/management, receiving UI
**Electron tasks:** Local supplier/purchase repositories (if needed offline)
**Local DB tasks:** Minimal (purchases primarily cloud-managed)
**Sync tasks:** Received stock synced from cloud to local
**Security tasks:** Permission checks (purchases.create, purchases.approve)
**Tests:**
- PO lifecycle transitions correctly
- Partial receiving updates quantities
- Inventory increases on receiving
- Supplier balance updates on payment
**Dependencies:** Phase 8 (inventory)
**Deliverables:** Supplier and purchase management
**Definition of Done:**
- Full PO lifecycle works
- Receiving updates inventory
- Supplier payments tracked

---

### PHASE 10 — Customers

**Objective:** Customer management with purchase history.

**Features:**
- Customer CRUD
- Customer search (name, phone)
- Attach customer to sale
- Customer purchase history
- Customer spending totals
- Loyalty points (basic)
- Customer credit balance (basic)

**Database changes:** None (tables exist)
**Backend tasks:** CustomerModule
**Frontend tasks:** Customer list, detail, search, inline creation at POS
**Electron tasks:** Local customer repository
**Local DB tasks:** Customer search optimization
**Sync tasks:** Customers queued for sync
**Security tasks:** Permission checks
**Tests:**
- Customer CRUD works
- Customer attached to sale appears in history
- Search by phone/name works
- Loyalty points accumulate
**Dependencies:** Phase 8 (sales reference customers)
**Deliverables:** Customer management
**Definition of Done:**
- Customers manageable locally and centrally
- Purchase history viewable
- Search works offline

---

### PHASE 11 — Returns & Refunds

**Objective:** Implement return and refund workflows.

**Features:**
- Lookup original sale by invoice number
- Full return (all items)
- Partial return (selected items/quantities)
- Refund processing
- Inventory restoration on return
- Refund permissions (configurable)
- Refund audit trail

**Database changes:** None (tables exist)
**Backend tasks:** RefundModule
**Frontend tasks:** Return/refund UI in POS, refund list in admin
**Electron tasks:** Refund service, inventory restoration
**Local DB tasks:** Refund transaction (refund + items + payment + inventory reversal + sync_queue)
**Sync tasks:** Refunds queued for sync
**Security tasks:** sales.refund permission required
**Tests:**
- Full return restores all inventory
- Partial return restores selected items
- Refund amount matches returned items
- Original sale status updated
- Refund without permission → blocked
**Dependencies:** Phase 8 (sales + inventory)
**Deliverables:** Return/refund capability
**Definition of Done:**
- Returns work for full and partial
- Inventory restored
- Audit trail complete

---

### PHASE 12 — Expenses & Finance

**Objective:** Expense tracking and financial overview.

**Features:**
- Expense CRUD
- Expense categories
- Expense attachments
- Cash movement during shift
- Cash withdrawal/deposit
- Financial summary (revenue, expenses, cash flow)

**Database changes:** None (tables exist)
**Backend tasks:** ExpenseModule, FinanceService
**Frontend tasks:** Expense management, financial overview, cash flow
**Electron tasks:** Local expense recording during shift
**Local DB tasks:** Expenses linked to cash sessions
**Sync tasks:** Expenses queued for sync
**Security tasks:** Permission checks
**Tests:**
- Expense deducts from cash session
- Expense categories work
- Financial summary calculates correctly
**Dependencies:** Phase 8 (cash sessions)
**Deliverables:** Expense and finance module
**Definition of Done:**
- Expenses recorded locally
- Cash flow visible
- Financial summary accurate

---

### PHASE 13 — Sync Engine

**Objective:** Build the complete bidirectional synchronization engine.

**Features:**
- Upload manager (batch sync_queue to server)
- Download manager (pull changes since checkpoint)
- Idempotency key enforcement (server-side)
- Duplicate protection (three layers)
- Retry with exponential backoff
- Sync checkpoints per entity type
- Conflict detection
- Conflict resolution (rules per entity type)
- Sync status tracking
- Sync log
- Manual sync trigger
- Background sync (non-blocking)
- Sync progress reporting to UI

**Database changes:** sync_operations table on server, sync_conflicts table
**Backend tasks:** SyncModule (upload endpoint, changes endpoint, conflict endpoint)
**Frontend tasks:** Sync indicator, sync center page (local admin)
**Electron tasks:** SyncEngine, UploadManager, DownloadManager, ConflictResolver
**Local DB tasks:** sync_queue processing, sync_checkpoints updates
**Sync tasks:** THIS IS THE SYNC PHASE
**Security tasks:** Device authentication for sync, payload validation
**Tests:**
- Sale syncs to server
- Duplicate sale (same idempotency_key) not duplicated
- Network timeout → retry succeeds
- Offline accumulates operations → all sync on reconnect
- Product price change downloads correctly
- Inventory movements reconcile additively
- Conflict detected and flagged
- Sync checkpoint advances
- Failed operations retry with backoff
**Dependencies:** Phase 8 (sales/inventory to sync), Phase 6 (offline infrastructure)
**Deliverables:** Working bidirectional sync
**Definition of Done:**
- Sales, inventory movements, customers, expenses sync to server
- Products, prices, users sync from server
- Duplicates impossible
- Conflicts detected and handled
- Retry works
- Sync works after extended offline period

---

### PHASE 14 — Cloud Admin Dashboard

**Objective:** Build the comprehensive cloud admin dashboard.

**Features:**
- Dashboard overview with charts
- All management pages (see §17)
- Branch selector
- Date range filtering
- DataTable with sorting, filtering, pagination
- Export functionality
- Responsive layout
- Arabic/English support

**Database changes:** None
**Backend tasks:** Report endpoints, dashboard statistics endpoint
**Frontend tasks:** All 12 major sections with sub-pages
**Electron tasks:** None
**Local DB tasks:** None
**Sync tasks:** None (dashboard reads from PostgreSQL)
**Security tasks:** Permission-based page access
**Tests:**
- Dashboard loads correct statistics
- Branch filter works across all pages
- DataTable pagination/sorting works
- Export generates correct files
- Unauthorized pages are blocked
**Dependencies:** Phase 13 (data must be in PostgreSQL via sync)
**Deliverables:** Complete admin dashboard
**Definition of Done:**
- All sections from §17 implemented
- Branch selector filters all queries
- Charts render correctly
- Export works (CSV, Excel)

---

### PHASE 15 — Reports

**Objective:** Implement comprehensive reporting.

**Features:**
- Sales reports (daily, weekly, monthly, by branch/cashier/product/category/payment method)
- Profit reports (revenue, cost, gross profit, margin)
- Inventory reports (stock levels, movement, valuation, dead stock)
- Cashier reports (performance, cash differences, discounts)
- Financial reports (revenue, expenses, cash flow)
- Custom date ranges
- Export (CSV, Excel, PDF)
- Materialized views for expensive queries
- Report caching

**Database changes:** daily_sales_summary, product_sales_summary materialized tables
**Backend tasks:** ReportModule, aggregation queries, materialized view refresh
**Frontend tasks:** Report pages with filters, charts, export buttons
**Electron tasks:** Local report generation from SQLite
**Local DB tasks:** Local aggregation queries
**Sync tasks:** None
**Security tasks:** reports.view, reports.financial permissions
**Tests:**
- Sales report matches sum of individual sales
- Profit calculation accurate
- Date range filter works
- Export generates valid files
- Local reports work offline
**Dependencies:** Phase 14 (admin dashboard)
**Deliverables:** Complete reporting suite
**Definition of Done:**
- All report types from §47 implemented
- Numbers are accurate
- Export works
- Local reports work offline

---

### PHASE 16 — Backup / Restore / Import / Export

**Objective:** Data protection and portability.

**Features:**
- Local SQLite backup (file copy with metadata)
- Backup versioning (no overwrite)
- Backup verification (checksum)
- Restore from backup (with validation)
- Cloud PostgreSQL backup (pg_dump)
- Offline export package generation
- Import package validation (company, branch, device, version, integrity)
- Incremental import (not full DB replace)
- Backup metadata tracking
- Backup encryption (optional)

**Database changes:** backup_metadata table
**Backend tasks:** Cloud backup script, export endpoint
**Frontend tasks:** Backup management UI (local admin)
**Electron tasks:** BackupService (create, restore, verify, list)
**Local DB tasks:** Backup metadata storage
**Sync tasks:** Export package for offline sync alternative
**Security tasks:** Backup encryption, company verification on import
**Tests:**
- Backup creates valid file with checksum
- Restore recovers data correctly
- Import rejects wrong company
- Import rejects wrong version
- Backup doesn't overwrite existing
- Corrupt backup detected
**Dependencies:** Phase 13 (sync foundation)
**Deliverables:** Complete backup/restore system
**Definition of Done:**
- Backups created and versioned
- Restore works
- Import validates and applies incrementally
- Checksums verified

---

### PHASE 17 — Hardware Integration

**Objective:** Integrate with POS hardware.

**Features:**
- Thermal printer support (ESC/POS protocol)
- Receipt printing (configurable template)
- Cash drawer trigger (via printer or direct)
- Barcode scanner detection (keyboard-wedge)
- Hardware configuration UI
- Printer test page
- Abstracted hardware interfaces (swappable implementations)

**Database changes:** None
**Backend tasks:** None
**Frontend tasks:** Hardware settings page, printer test
**Electron tasks:** PrinterService, CashDrawerService, BarcodeService implementations
**Local DB tasks:** Hardware config in local_settings
**Sync tasks:** None
**Security tasks:** Hardware access restricted to main process
**Tests:**
- Receipt prints with correct formatting
- Cash drawer opens on command
- Barcode scanner input detected and routed
- Printer failure handled gracefully (sale not lost)
- Template renders correctly for Arabic + English
**Dependencies:** Phase 7 (POS)
**Deliverables:** Working hardware integration
**Definition of Done:**
- Receipt prints correctly
- Cash drawer opens
- Barcode scanner works
- Hardware errors don't block sales

---

### PHASE 18 — Security & Audit

**Objective:** Security hardening and comprehensive audit logging.

**Features:**
- Complete audit log implementation (all sensitive operations from §53)
- Audit log viewer (admin dashboard)
- Rate limiting on all endpoints
- Input validation audit (all endpoints)
- SQL injection review
- XSS protection review
- Electron security audit (CSP, context isolation, preload review)
- IPC channel security review
- Credential storage review
- Sensitive data in logs review
- Permission audit (all endpoints have permission guards)

**Database changes:** Audit log partitioning by month
**Backend tasks:** AuditInterceptor, rate limiting, security headers, vulnerability scan
**Frontend tasks:** Audit log viewer page
**Electron tasks:** Security hardening review
**Local DB tasks:** Audit log cleanup/archival
**Sync tasks:** None
**Security tasks:** THIS IS THE SECURITY PHASE
**Tests:**
- Audit log records all operations from §53
- Rate limiting blocks excessive requests
- Invalid input rejected everywhere
- Electron renderer has no Node.js access
- Plaintext passwords never in logs
- SQL injection attempts fail
**Dependencies:** Phase 14 (admin dashboard for audit viewer)
**Deliverables:** Hardened, auditable system
**Definition of Done:**
- Every sensitive operation audited
- No security vulnerabilities found
- Rate limiting active
- All inputs validated

---

### PHASE 19 — Testing & Failure Recovery

**Objective:** Comprehensive testing including failure scenarios.

**Features:**
- Unit test suite (money, tax, discount, inventory, sync)
- Integration test suite (sale flow, refund flow, sync flow, backup/restore)
- E2E test suite (full POS flow, offline scenario, sync recovery)
- Failure scenario tests (all from §89)
- Performance testing (POS responsiveness, sync throughput)
- Multi-terminal offline simulation

**Database changes:** None
**Backend tasks:** API integration tests, load tests
**Frontend tasks:** Component tests, E2E with Playwright
**Electron tasks:** E2E tests with Playwright + Electron
**Local DB tasks:** Transaction safety tests
**Sync tasks:** Sync failure/recovery tests
**Security tasks:** Penetration test checklist
**Tests:** THIS IS THE TESTING PHASE — all tests from §88 and §89
**Dependencies:** Phase 18 (system complete)
**Deliverables:** Comprehensive test suite, test report
**Definition of Done:**
- All unit tests pass
- All integration tests pass
- All E2E tests pass
- All failure scenarios handled gracefully
- No data loss in any failure scenario
- Performance meets targets (barcode scan < 50ms, sale completion < 200ms)

---

### PHASE 20 — Production Deployment

**Objective:** Deploy to production.

**Features:**
- Docker production builds
- Docker Compose for production (backend + postgres + redis + nginx)
- Nginx configuration (TLS, rate limiting, proxy)
- HTTPS certificate (Let's Encrypt)
- PostgreSQL production tuning
- PostgreSQL backup cron
- Application logging (structured, centralized)
- Health monitoring
- Error tracking
- Electron production build (electron-builder)
- Windows installer (NSIS)
- Auto-update mechanism (optional, for online clients)
- Environment configuration (dev/staging/production)
- Deployment scripts

**Database changes:** None
**Backend tasks:** Dockerfile, production config, health endpoints, structured logging
**Frontend tasks:** Production build, bundle optimization
**Electron tasks:** electron-builder config, installer, code signing (optional)
**Local DB tasks:** None
**Sync tasks:** None
**Security tasks:** Production security headers, TLS, firewall rules
**Tests:** Smoke tests in staging environment
**Dependencies:** Phase 19 (all tests pass)
**Deliverables:** Production-ready deployment
**Definition of Done:**
- Backend running in Docker on VPS
- HTTPS active
- PostgreSQL backed up daily
- Electron installer produced
- Logs structured and centralized
- Health endpoint monitored
- Staging environment validated

---

## 21. MVP Definition

### MVP (Minimum Viable Product)

The MVP is the smallest version that a single-branch supermarket can use to operate daily.

**Included in MVP:**

| Module | Features |
|---|---|
| **Foundation** | Electron + React + SQLite + NestJS + PostgreSQL |
| **Auth** | Online login, offline login, basic RBAC (admin, cashier) |
| **Company/Branch** | Single company, single branch, single terminal |
| **Products** | CRUD, categories, barcode, single price, tax |
| **POS** | Scan, search, cart, cash payment, receipt preview |
| **Sales** | Sale creation, sale list, sale detail |
| **Inventory** | Stock levels, stock decrement on sale, low stock |
| **Cash Sessions** | Open/close shift, cash reconciliation |
| **Offline** | Full offline POS operation |
| **Sync** | Basic upload sync (sales → cloud), basic download (products → local) |
| **Admin Dashboard** | Dashboard overview, products, sales, inventory, basic reports |
| **Backup** | Local SQLite backup/restore |

**Excluded from MVP (deferred to V1):**
- Multi-branch (architecture supports it, but UI limited to single branch)
- Split payment
- Returns/refunds
- Purchases/suppliers
- Customers
- Expenses
- Advanced reports
- Hardware integration (receipt printing)
- Sync conflict resolution (basic "server wins" only)
- Audit logs
- Offline export/import packages

### Version 1

Adds:
- Multi-branch management
- Multiple payment methods + split payment
- Returns and refunds
- Purchases and suppliers
- Customer management
- Expense tracking
- Complete reporting suite
- Advanced RBAC + custom roles
- Sync Center (conflicts, retry, history)
- Hardware integration (thermal printer, cash drawer)
- Audit logs
- Full backup/restore/export/import

### Version 2

Considers:
- Loyalty program
- Advanced analytics & dashboards
- Advanced promotions (buy-one-get-one, bundles)
- Advanced inventory (stock counting, dead stock analysis)
- Mobile management app
- Advanced realtime (live dashboards)
- Multi-currency
- API integrations (accounting software, e-commerce)
- Warehouse management

---

## 22. Risks

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| **SQLite locking under heavy use** | POS blocked | Low (single-writer per terminal) | WAL mode, retry with backoff, one writer per process |
| **Sync data volume too large** | Slow sync, timeout | Medium | Batching, delta sync, compression, pagination |
| **Conflict resolution correctness** | Data integrity loss | Medium | Extensive testing, additive inventory model, admin review for ambiguous cases |
| **Electron memory usage** | App sluggish with large catalogs | Medium | Product list virtualization, lazy loading, SQLite pagination |
| **Offline period too long** | Credential expiration, large sync backlog | Medium | Configurable offline duration, batched sync, checkpoint-based delta |
| **Drizzle ORM limitations** | Blocked on advanced queries | Low | Drizzle supports raw SQL fallback |
| **better-sqlite3 native module** | Electron rebuild issues | Medium | Pin versions, CI build matrix, electron-rebuild script |
| **Concurrent schema migrations** | Database corruption on update | Low | Migration locking (file lock on SQLite, advisory lock on PG) |
| **Time zone issues** | Incorrect reporting | Medium | All timestamps in UTC, display in local timezone, ISO 8601 everywhere |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| **Scope creep** | Missed deadlines | High | Strict phase discipline, MVP first |
| **User rejects new system** | Adoption failure | Medium | Cashier-friendly UX, training mode, gradual rollout |
| **Hardware compatibility** | Printer doesn't work | Medium | Abstracted interfaces, ESC/POS standard, hardware testing matrix |
| **Data loss (customer perceives)** | Trust loss | High | Atomic transactions, backup reminders, sync verification |
| **Internet-dependent features used offline** | Confusion | Medium | Clear offline indicators, graceful degradation messaging |

### Edge Cases to Handle

1. **Power failure during SQLite write**: WAL mode ensures recovery. SQLite transactions are atomic at the OS level.
2. **Two cashiers log into same terminal**: Prevent — only one active session per terminal. Second login shows "terminal in use."
3. **Product price changes mid-cart**: Cart freezes the price at the time the item was added. Price changes don't retroactively modify existing carts.
4. **Clock skew between terminals**: Use ULID (time-based but with random suffix). Sync server uses its own timestamp for ordering.
5. **Database full (disk space)**: Monitor disk space, warn at 90%, prevent new sales at 99%.
6. **Very large sync backlog (weeks offline)**: Batch into pages of 100 operations. Server processes each page independently. Progress reported to UI.

---

## 23. Testing Strategy

### Test Pyramid

```
        ┌──────────┐
        │   E2E    │  ← 10-15 critical flows
        │ (few)    │
        ├──────────┤
        │Integration│ ← 50-100 tests
        │ (medium) │
        ├──────────┤
        │   Unit   │  ← 200+ tests
        │ (many)   │
        └──────────┘
```

### Unit Tests (Vitest)

**What to test:**
- Money arithmetic (add, subtract, multiply, divide, no precision loss)
- Tax calculations (inclusive, exclusive, basis points)
- Discount calculations (percentage, fixed, per-item, per-invoice)
- Cart total calculations
- Invoice number generation
- ULID generation uniqueness
- Sync queue priority ordering
- Permission checking logic
- Date formatting (Arabic, English)
- Currency formatting

### Integration Tests (Vitest + better-sqlite3 in-memory)

**What to test:**
- Sale creation transaction (all tables updated atomically)
- Sale creation with insufficient stock (blocked or allowed per policy)
- Refund with inventory restoration
- Cash session open → sales → close → reconciliation
- Sync upload with idempotency (duplicate detected)
- Sync download with conflict (resolution applied)
- Backup create → corrupt → checksum fails
- Backup create → restore → data identical
- User login → offline cache → offline login → works
- User login → offline cache expired → offline login → rejected

### E2E Tests (Playwright + Electron)

**Critical flows:**
1. **Happy path**: Login → open shift → scan product → pay cash → receipt → close shift
2. **Offline sale**: Disconnect → scan → pay → verify sale in SQLite → reconnect → verify sale in PostgreSQL
3. **Sync recovery**: Create 10 sales offline → reconnect → all 10 appear in cloud → no duplicates
4. **Multi-terminal inventory**: POS-1 sells 3, POS-2 sells 4 (offline) → reconcile → stock correct
5. **Crash recovery**: Kill Electron mid-sale → restart → verify data integrity
6. **Refund flow**: Complete sale → refund 1 item → verify inventory + cash session
7. **Cash session discrepancy**: Open → sell → withdraw → close → verify expected vs actual
8. **Auth offline**: Login online → cache credentials → go offline → logout → login offline
9. **Product update sync**: Update price on server → sync to terminal → POS shows new price
10. **Held cart**: Add items → hold → new sale → resume held cart → complete

### Failure Scenario Tests

| Scenario | Test Method | Expected Behavior |
|---|---|---|
| Internet drops mid-sale | Mock network failure in sale service | Sale completes locally, queued for sync |
| Internet drops mid-sync | Mock network failure in upload manager | Operation stays in queue, retried later |
| App crash during sale | Kill process in transaction | SQLite rollback, no partial sale |
| Same sale uploaded twice | Send same idempotency_key twice | Server returns "already processed", no duplicate |
| Server returns 500 | Mock server error | Operation marked FAILED, retry scheduled |
| SQLite locked | Simulate concurrent write | Retry after short delay, eventually succeeds |
| Printer fails | Mock printer error | Sale still completes, "print failed" notification |
| Two terminals sell last unit | Both sync after selling | Server has -1 stock, admin notified |
| Backup from wrong company | Attempt restore with mismatched company_id | Rejected with clear error message |
| Database migration fails | Corrupt migration file | Rollback, app refuses to start with clear error |

### Performance Benchmarks

| Operation | Target |
|---|---|
| Barcode lookup | < 10ms |
| Product search (by name) | < 50ms |
| Cart recalculation | < 5ms |
| Sale completion (SQLite transaction) | < 100ms |
| Sync upload (single sale) | < 500ms (network excluded) |
| Application startup | < 3 seconds |
| Receipt rendering | < 50ms |

---

## 24. Production Deployment

### Cloud Infrastructure

```
┌──────────────────────────────────────────────────┐
│  VPS (Linux, 4+ GB RAM, 2+ vCPUs)               │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │ Docker Compose                              │ │
│  │                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │    Nginx      │  │   Backend   │        │ │
│  │  │  (port 443)   │─▶│  (port 3000) │        │ │
│  │  │  TLS + proxy  │  │  NestJS      │        │ │
│  │  └──────────────┘  └──────────────┘        │ │
│  │                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │  PostgreSQL  │  │    Redis     │        │ │
│  │  │  (port 5432)  │  │  (port 6379) │        │ │
│  │  └──────────────┘  └──────────────┘        │ │
│  │                                             │ │
│  │  ┌──────────────┐                          │ │
│  │  │ Admin Web    │                          │ │
│  │  │ (static, via │                          │ │
│  │  │  Nginx)      │                          │ │
│  │  └──────────────┘                          │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Docker Compose (Production)

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certbot/conf:/etc/letsencrypt
      - ./admin-web/dist:/usr/share/nginx/html
    depends_on:
      - backend

  backend:
    build: ./apps/backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://...
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=supermarket
      - POSTGRES_USER=${PG_USER}
      - POSTGRES_PASSWORD=${PG_PASSWORD}
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
```

### Electron Distribution

```
Build targets:
  - Windows: NSIS installer (.exe)
  - macOS: DMG (if needed)
  - Linux: AppImage / deb (if needed)

Update strategy:
  - For online clients: Electron auto-updater (GitHub Releases or custom server)
  - For offline clients: Manual installer download and reinstall
    → Database preserved (user data directory separate from app)
    → Migrations run on first start after update
```

### Backup Strategy (Production)

```
PostgreSQL:
  - Daily pg_dump to compressed file
  - Stored in separate directory with 30-day retention
  - Weekly copy to off-site storage (if budget allows)
  - Cron: 0 2 * * * /scripts/backup-db.sh

SQLite (per terminal):
  - Configurable automatic backup (daily/weekly)
  - Stored in backup directory with versioning
  - Admin can manually trigger backup
  - Backup verified with checksum before confirmation
```

### Monitoring

```
Backend:
  - /api/v1/health endpoint (readiness + liveness)
  - Structured JSON logs (pino via Fastify)
  - Error tracking (Sentry or similar, optional)
  - Uptime monitoring (UptimeRobot or similar)

Metrics to watch:
  - API response times (p50, p95, p99)
  - Sync operations per minute
  - Failed sync rate
  - Active devices count
  - Database connection pool usage
  - Memory usage
  - Disk usage
```

### Environment Configuration

```
.env.development:
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/supermarket_dev
  JWT_SECRET=dev-secret-not-for-production
  REDIS_URL=redis://localhost:6379
  API_PORT=3000

.env.staging:
  DATABASE_URL=postgresql://...
  JWT_SECRET=${STAGING_JWT_SECRET}
  REDIS_URL=redis://...
  API_PORT=3000

.env.production:
  DATABASE_URL=postgresql://...
  JWT_SECRET=${PRODUCTION_JWT_SECRET}
  REDIS_URL=redis://...
  API_PORT=3000

NEVER committed to Git:
  - JWT_SECRET
  - JWT_REFRESH_SECRET
  - DATABASE_URL (with password)
  - ENCRYPTION_KEY
  - PG_PASSWORD
```

---

> [!IMPORTANT]
> **This document is Phase 0 — the complete architecture and plan.** No implementation code should be written until this plan is reviewed and approved. After approval, implementation proceeds phase-by-phase starting with Phase 1.

