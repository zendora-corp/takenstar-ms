/*
  # TTSE Management System Database Schema

  ## Overview
  Complete database schema for Takenstar Talent Search Exam (TTSE) 2025 management system.
  Supports role-based access control, student registrations, exam results, and administrative functions.

  ## Tables Created

  1. **users** - Admin and Manager accounts
     - id (uuid, primary key)
     - name (text)
     - email (text, unique)
     - password_hash (text)
     - role (enum: admin, manager)
     - created_at, updated_at (timestamptz)

  2. **districts** - Geographic districts
     - id (uuid, primary key)
     - name (text, unique)
     - status (enum: active, inactive, default active)
     - created_at, updated_at (timestamptz)

  3. **schools** - Schools within districts
     - id (uuid, primary key)
     - name (text)
     - district_id (uuid, foreign key to districts)
     - address (text, optional)
     - medium (enum: Assamese, English, Both, optional)
     - status (enum: active, inactive, default active)
     - created_at, updated_at (timestamptz)
     - Unique constraint: (name, district_id)

  4. **exam_years** - Exam year configurations
     - id (uuid, primary key)
     - year (integer, unique)
     - registration_open_date (date)
     - registration_close_date (date)
     - exam_date (date)
     - result_date (date)
     - status (enum: active, archived, default active)
     - created_at, updated_at (timestamptz)

  5. **registrations** - Student registrations (created via public API only)
     - id (uuid, primary key)
     - exam_year_id (uuid, foreign key to exam_years)
     - full_name (text)
     - gender (enum: Male, Female, Other)
     - dob (date)
     - class (integer, 6-12)
     - group_type (enum: A, B, derived from class)
     - medium (enum: Assamese, English)
     - school_id (uuid, foreign key to schools)
     - school_roll_no (text)
     - district_id (uuid, foreign key to districts, denormalized)
     - area_or_district_name (text, snapshot)
     - address (text)
     - student_mobile (text, 10-digit)
     - guardian_mobile (text, 10-digit)
     - email (text, optional)
     - payment_option (enum: Online, Offline)
     - payment_status (enum: Pending, Verified, Rejected, default Pending)
     - transaction_id (text, optional)
     - offline_receipt_no (text, optional)
     - payment_notes (text, optional)
     - payment_updated_by (uuid, foreign key to users, optional)
     - payment_updated_at (timestamptz, optional)
     - created_by_role (text, default 'public')
     - created_at, updated_at (timestamptz)
     - Unique constraint: (exam_year_id, school_id, district_id, school_roll_no)

  6. **results** - Exam results/marks
     - id (uuid, primary key)
     - exam_year_id (uuid, foreign key to exam_years)
     - registration_id (uuid, foreign key to registrations, unique)
     - gk (integer, 0-100)
     - science (integer, 0-100)
     - mathematics (integer, 0-100)
     - logical_reasoning (integer, 0-100)
     - current_affairs (integer, 0-100)
     - total (integer, computed)
     - percentage (numeric, computed)
     - rank_global (integer, optional)
     - rank_school (integer, optional)
     - created_by (uuid, foreign key to users)
     - created_at, updated_at (timestamptz)

  7. **contact_messages** - Contact form submissions
     - id (uuid, primary key)
     - name (text)
     - email (text)
     - subject (text)
     - message (text)
     - status (enum: new, read, default new)
     - created_at, updated_at (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies restrict access based on authentication and role
  - Public tables (contact_messages, registrations) have limited insert policies
  - Admin/Manager access controlled via role checks

  ## Indexes
  - Primary keys on all tables
  - Unique indexes for business constraints
  - Performance indexes on frequently queried columns
*/

-- Create enums
CREATE TYPE user_role AS ENUM ('admin', 'manager');
CREATE TYPE entity_status AS ENUM ('active', 'inactive');
CREATE TYPE exam_year_status AS ENUM ('active', 'archived');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE group_type AS ENUM ('A', 'B');
CREATE TYPE medium_type AS ENUM ('Assamese', 'English', 'Both');
CREATE TYPE payment_option_type AS ENUM ('Online', 'Offline');
CREATE TYPE payment_status_type AS ENUM ('Pending', 'Verified', 'Rejected');
CREATE TYPE contact_status_type AS ENUM ('new', 'read');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'manager',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Districts table
CREATE TABLE IF NOT EXISTS districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  status entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_districts_name ON districts(name);
CREATE INDEX IF NOT EXISTS idx_districts_status ON districts(status);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district_id uuid NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  address text,
  medium medium_type,
  status entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_school_per_district UNIQUE (name, district_id)
);

CREATE INDEX IF NOT EXISTS idx_schools_district ON schools(district_id);
CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);

-- Exam Years table
CREATE TABLE IF NOT EXISTS exam_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer UNIQUE NOT NULL,
  registration_open_date date NOT NULL,
  registration_close_date date NOT NULL,
  exam_date date NOT NULL,
  result_date date NOT NULL,
  status exam_year_status NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_years_year ON exam_years(year);
CREATE INDEX IF NOT EXISTS idx_exam_years_status ON exam_years(status);

-- Registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_year_id uuid NOT NULL REFERENCES exam_years(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  gender gender_type NOT NULL,
  dob date NOT NULL,
  class integer NOT NULL CHECK (class >= 6 AND class <= 12),
  group_type group_type NOT NULL,
  medium medium_type NOT NULL,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_roll_no text NOT NULL,
  district_id uuid NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  area_or_district_name text NOT NULL,
  address text NOT NULL,
  student_mobile text NOT NULL,
  guardian_mobile text NOT NULL,
  email text,
  payment_option payment_option_type NOT NULL,
  payment_status payment_status_type NOT NULL DEFAULT 'Pending',
  transaction_id text,
  offline_receipt_no text,
  payment_notes text,
  payment_updated_by uuid REFERENCES users(id),
  payment_updated_at timestamptz,
  created_by_role text NOT NULL DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_registration UNIQUE (exam_year_id, school_id, district_id, school_roll_no)
);

CREATE INDEX IF NOT EXISTS idx_registrations_exam_year ON registrations(exam_year_id);
CREATE INDEX IF NOT EXISTS idx_registrations_school ON registrations(school_id);
CREATE INDEX IF NOT EXISTS idx_registrations_district ON registrations(district_id);
CREATE INDEX IF NOT EXISTS idx_registrations_class ON registrations(class);
CREATE INDEX IF NOT EXISTS idx_registrations_group ON registrations(group_type);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_school_roll ON registrations(school_roll_no);

-- Results table
CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_year_id uuid NOT NULL REFERENCES exam_years(id) ON DELETE CASCADE,
  registration_id uuid UNIQUE NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  gk integer NOT NULL CHECK (gk >= 0 AND gk <= 100),
  science integer NOT NULL CHECK (science >= 0 AND science <= 100),
  mathematics integer NOT NULL CHECK (mathematics >= 0 AND mathematics <= 100),
  logical_reasoning integer NOT NULL CHECK (logical_reasoning >= 0 AND logical_reasoning <= 100),
  current_affairs integer NOT NULL CHECK (current_affairs >= 0 AND current_affairs <= 100),
  total integer NOT NULL,
  percentage numeric(5,2) NOT NULL,
  rank_global integer,
  rank_school integer,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_results_exam_year ON results(exam_year_id);
CREATE INDEX IF NOT EXISTS idx_results_registration ON results(registration_id);
CREATE INDEX IF NOT EXISTS idx_results_total ON results(total DESC);
CREATE INDEX IF NOT EXISTS idx_results_created_by ON results(created_by);

-- Contact Messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status contact_status_type NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for districts
CREATE POLICY "Authenticated users can view districts"
  ON districts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Manager can insert districts"
  ON districts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can update districts"
  ON districts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete districts"
  ON districts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for schools
CREATE POLICY "Authenticated users can view schools"
  ON schools FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Manager can insert schools"
  ON schools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can update schools"
  ON schools FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete schools"
  ON schools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for exam_years
CREATE POLICY "Authenticated users can view exam years"
  ON exam_years FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert exam years"
  ON exam_years FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update exam years"
  ON exam_years FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete exam years"
  ON exam_years FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for registrations
CREATE POLICY "Authenticated users can view registrations"
  ON registrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can insert registrations"
  ON registrations FOR INSERT
  TO anon
  WITH CHECK (created_by_role = 'public');

CREATE POLICY "Admins can update registrations"
  ON registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete registrations"
  ON registrations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for results
CREATE POLICY "Authenticated users can view results"
  ON results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Manager can insert results"
  ON results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can update results"
  ON results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete results"
  ON results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for contact_messages
CREATE POLICY "Authenticated users can view contact messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can insert contact messages"
  ON contact_messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can update contact messages"
  ON contact_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete contact messages"
  ON contact_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_years_updated_at BEFORE UPDATE ON exam_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_results_updated_at BEFORE UPDATE ON results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON contact_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();