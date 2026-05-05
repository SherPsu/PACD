# MEMSEC PACD Monitoring System

A web-based monitoring system for the **MEMSEC Public Assistance Complaint Desk (PACD)**, built as a single-page application (SPA) with Firebase as the backend.

## Features

### Core Functionality
- **Daily Entry Form** — Record daily activities with date and officer-in-charge
- **Clients Served Tracking** — New Member, Amendment, Yakap Assignment, ER2
- **Customer Satisfaction Survey** — Yes/No response tracking per day
- **Auto-calculation** — Total clients computed in real time

### Data Management
- **Firestore Database** — Cloud-hosted, real-time data sync via Firebase Firestore
- **CRUD Operations** — Create, Read, Update, Delete records
- **Search & Filter** — Filter records by date or officer name
- **Data Export** — Export to Excel (XLSX) and PDF formats
- **Activity Log** — Audit trail of all record changes (add, edit, delete)

### Analytics & Visualization
- **Dashboard** — Real-time statistics: totals, averages, satisfaction rate
- **Interactive Charts** — Weekly trends and satisfaction breakdown via Chart.js
- **Responsive Design** — Works on desktop, tablet, and mobile

### Authentication & User Management
- **Firebase Authentication** — Email/password login
- **Role-based Access** — Two roles: `admin` and `officer`
- **Admin Panel** — Admins can create, disable, reset passwords, and delete officer accounts
- **Officer Dropdown** — Auto-populated from Firestore; officers are pre-assigned their own name

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Backend / DB | Firebase Firestore |
| Auth | Firebase Authentication |
| Charts | Chart.js |
| Export | SheetJS (xlsx), html2canvas, jsPDF |

## Firestore Collections

| Collection | Purpose |
|---|---|
| `pacd_records` | Daily monitoring records |
| `users` | User profiles (name, email, role, disabled) |
| `pacd_activity_log` | Audit log of record changes |

## User Roles

| Role | Capabilities |
|---|---|
| `admin` | Full access — view all records, manage users, export data |
| `officer` | Data entry only — pre-assigned to their own name, cannot manage users |

## Quick Start

1. Open the app in a browser
2. Log in with your assigned email and password
3. Officers — fill in the Daily Entry form and click **Save Record**
4. Admins — use **Manage Users** to create or manage officer accounts

## Browser Compatibility

| Browser | Status |
|---|---|
| Chrome 80+ | Full Support |
| Firefox 75+ | Full Support |
| Safari 13+ | Full Support |
| Edge 80+ | Full Support |

## Troubleshooting

- **Login fails** — Check email/password; account may be disabled
- **Dropdown empty** — No active officer accounts in Firestore yet; create one via Manage Users
- **Charts not showing** — Check internet connection (Chart.js loads from CDN)
- **Export not working** — Check browser download permissions

---

**MEMSEC PACD Monitoring System** — Efficient, cloud-backed complaint desk management.
