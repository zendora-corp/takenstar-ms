# TTSE Management System

Takenstar Talent Search Exam (TTSE) 2025 - Admin/Manager Dashboard with Public APIs

## Tech Stack

- **Next.js 14+** (App Router)
- **TypeScript**
- **MUI v5** (Material-UI)
- **PostgreSQL** via Supabase
- **NextAuth.js** for authentication
- **Zod** for validation
- **SWR** for data fetching

## Features

### Public APIs
- Student registration submission
- Reference data (districts, schools)
- Contact form submission
- Result lookup by roll number
- Hall of fame (toppers)

### Dashboard (Admin/Manager)
- **Authentication**: Email/password login with RBAC
- **Registrations**: View all registrations, update payment status (no creation via dashboard)
- **Results**: Enter and manage exam marks
- **Schools & Districts**: CRUD operations
- **Exam Years**: Manage exam configurations
- **Contacts**: View and manage contact messages
- **Toppers**: Global and school-wise top performers
- **Users**: Create Admin/Manager accounts (Admin only)
- **Import/Export**: CSV operations (Admin only)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

The `.env` file is already configured with Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXTAUTH_SECRET=change_me_to_a_secure_random_string_for_production
NEXTAUTH_URL=http://localhost:3000
```

**Important**: Change `NEXTAUTH_SECRET` to a secure random string before deploying to production.

### 3. Database Setup

The database schema has been automatically created in Supabase with all necessary tables:
- users
- districts
- schools
- exam_years
- registrations
- results
- contact_messages

All tables have Row Level Security (RLS) enabled with appropriate policies.

### 4. Seed Initial Data

Run the seed script to create:
- Admin user (admin@ttse.local / Admin@12345)
- District: Sivasagar
- School: Takenstar Partner School
- Exam Year: 2025

```bash
npm run seed
```

### 5. Development

Start the development server:

```bash
npm run dev
```

Visit http://localhost:3000 - you'll be redirected to the login page.

### 6. Build for Production

```bash
npm run build
npm start
```

## Default Login Credentials

After running the seed script:

- **Email**: admin@ttse.local
- **Password**: Admin@12345

## API Documentation

### Public Endpoints (No Authentication Required)

#### POST /api/public/registrations
Create a student registration.

**Body**:
```json
{
  "examYear": 2025,
  "fullName": "John Doe",
  "gender": "Male",
  "dob": "2010-05-15",
  "class": 10,
  "medium": "English",
  "districtName": "Sivasagar",
  "schoolName": "Takenstar Partner School",
  "schoolRollNo": "123",
  "address": "123 Main St",
  "studentMobile": "9876543210",
  "guardianMobile": "9876543211",
  "email": "john@example.com",
  "paymentOption": "Online",
  "transactionId": "TXN123456"
}
```

#### GET /api/public/refs/districts
List all active districts.

#### GET /api/public/refs/schools?districtId={uuid}
List schools in a district.

#### POST /api/public/contact
Submit contact form.

#### GET /api/public/result-lookup?examYear=2025&districtName=Sivasagar&schoolName=School&schoolRollNo=123
Look up student results.

#### GET /api/public/hall-of-fame?examYear=2025&group=A
Get top 3 performers.

### Protected Endpoints (Require Authentication)

All dashboard APIs require NextAuth session:

- **GET/POST /api/districts** - Manage districts
- **GET/POST /api/schools** - Manage schools
- **GET/POST /api/exam-years** - Manage exam years
- **GET /api/registrations** - View registrations (no POST allowed)
- **PATCH /api/registrations/:id/payment** - Update payment status
- **GET/POST /api/results** - Manage results
- **GET /api/results/toppers/global** - Global toppers
- **GET /api/results/toppers/school** - School toppers
- **GET /api/contacts** - View contact messages
- **POST /api/auth/register-internal** - Create users (Admin only)

## Roles & Permissions

### Admin
- Full CRUD on all entities (except creating registrations via dashboard)
- Can verify/reject payment status
- CSV import/export
- User management
- View all data

### Manager
- Create: Schools, Districts, Results
- Read: All data
- Update: Payment status on registrations
- Cannot: Edit/Delete Schools, Districts, Results, Exam Years

## Database Schema

### Key Tables

**users**: Admin and Manager accounts with bcrypt password hashing

**districts**: Geographic districts (active/inactive status)

**schools**: Schools linked to districts (unique per district)

**exam_years**: Exam configurations with registration and result dates

**registrations**: Student registrations (created via public API only)
- Unique constraint: (exam_year_id, school_id, district_id, school_roll_no)
- Denormalized district_id for efficient filtering
- Payment tracking fields

**results**: Exam marks with auto-calculated totals and percentages
- Subjects: GK, Science, Math, Logical Reasoning, Current Affairs
- One result per registration

**contact_messages**: Contact form submissions

## Data Integrity Rules

1. **No Duplicate Registrations**: Enforced by unique index on (exam_year, school, district, roll number)
2. **Auto-derived Groups**: Class 6-8 → Group A, Class 9-12 → Group B
3. **Payment Validation**: Online payments require transaction ID
4. **Result Calculations**: Total and percentage auto-computed
5. **RLS Policies**: All tables protected by Row Level Security

## Rate Limiting

Public endpoints are rate-limited:
- 5 requests per minute per IP
- Applies to: registrations, result-lookup, contact

## Development Notes

- Use `npm run typecheck` to verify TypeScript
- Seed script is idempotent (safe to run multiple times)
- All API responses follow `{ success: boolean, data?: any, error?: string }` format
- Date formats: YYYY-MM-DD for consistency

## License

Proprietary - Takenstar Talent Search Exam 2025
