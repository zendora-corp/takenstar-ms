# TTSE Dashboard Smoke Test Checklist

## Pre-requisites

1. Run seed script to populate initial data:
```bash
npm run seed
```

2. Login credentials:
   - **Email**: admin@ttse.local
   - **Password**: Admin@12345

3. Start development server:
```bash
npm run dev
```

4. Visit: http://localhost:3000

---

## Test Scenarios

### 1. Authentication & Access Control

#### Login
- [ ] Navigate to http://localhost:3000
- [ ] Redirects to /login
- [ ] Enter valid credentials
- [ ] Successfully logs in and redirects to /dashboard
- [ ] Navigation sidebar displays with user info

#### Role-based Access
- [ ] As Admin: All menu items visible (including Users, Import/Export)
- [ ] As Manager: Users and Import/Export menu items hidden
- [ ] Logout button works and redirects to login

---

### 2. Dashboard Overview

#### Stat Cards
- [ ] All 4 stat cards display with correct numbers
- [ ] Click "Total Registrations" → navigates to /dashboard/registrations
- [ ] Click "Total Schools" → navigates to /dashboard/schools
- [ ] Click "Results Entered" → navigates to /dashboard/results
- [ ] Click "Pending Contacts" → navigates to /dashboard/contacts?status=new

#### Registration Chart
- [ ] Chart displays below stat cards (if registrations exist)
- [ ] Shows last 8 weeks of data
- [ ] X-axis shows week labels
- [ ] Y-axis shows count

---

### 3. Registrations Page

#### Data Display
- [ ] Navigate to /dashboard/registrations
- [ ] DataGrid loads with student registrations
- [ ] Columns display: Candidate, Class, Group, District, School, Roll No, Payment, Created At, Actions
- [ ] Payment status shows colored chips (Pending=warning, Verified=success, Rejected=error)
- [ ] Pagination controls at bottom work

#### Search & Filters
- [ ] Type in search box → results filter after 300ms delay
- [ ] Select Exam Year filter → table updates
- [ ] Select District filter → table updates
- [ ] Select School filter (after district) → table updates
- [ ] Select Class filter → table updates
- [ ] Select Group filter → table updates
- [ ] Filter chips appear showing active filters
- [ ] "Clear Filters" button clears all filters

#### Payment Verification
- [ ] Click "Payment" button on any row
- [ ] Dialog opens with student name and payment option (read-only)
- [ ] Change Payment Status dropdown
- [ ] Enter Transaction ID (optional)
- [ ] Enter Offline Receipt No (optional)
- [ ] Enter Notes
- [ ] Click "Update" → Success message appears
- [ ] Table refreshes with updated payment status
- [ ] Close dialog with Cancel or X

#### Detail View
- [ ] Click "View" button on any row
- [ ] Right drawer slides open
- [ ] All registration fields display correctly
- [ ] Close drawer with X or click outside

#### Export
- [ ] Click "Export CSV" button in toolbar
- [ ] CSV file downloads with filename `registrations_YYYY-MM-DD.csv`
- [ ] Open CSV → verify data matches table

---

### 4. Results Page

#### Data Display
- [ ] Navigate to /dashboard/results
- [ ] DataGrid loads with results
- [ ] Columns show: Student (from registration), Class, Group, Subject Marks, Total, %, Ranks
- [ ] Pagination works

#### Add Result
- [ ] Click "Add Result" button
- [ ] Dialog opens with form
- [ ] Select Registration (autocomplete/dropdown)
- [ ] Enter marks for all 5 subjects (GK, Science, Math, Logical, Current Affairs)
- [ ] Total and Percentage auto-calculate as you type
- [ ] Validate: marks must be 0-100
- [ ] Click "Save" → Success message
- [ ] New result appears in table

#### Edit Result
- [ ] Click "Edit" button on any row (Admin only)
- [ ] Dialog opens pre-filled with current marks
- [ ] Change any mark
- [ ] Total/Percentage recalculate
- [ ] Click "Save" → Updates successfully

#### Delete Result
- [ ] As Admin: "Delete" button visible
- [ ] Click Delete → Confirmation dialog appears
- [ ] Click Confirm → Result removed from table
- [ ] As Manager: Delete button hidden/disabled

#### View Toppers Link
- [ ] Click "View Toppers" button
- [ ] Navigates to /dashboard/toppers
- [ ] Filters preserved (if any)

---

### 5. Toppers Page

#### Global Tab
- [ ] Default tab is "Global Toppers"
- [ ] Select Exam Year → list updates
- [ ] Select Group (A or B) → list updates
- [ ] Top 10 students display
- [ ] Top 3 show medal icons (gold, silver, bronze)
- [ ] Each card shows: Avatar with initials, Name, School, Total marks, Percentage

#### School-wise Tab
- [ ] Click "School-wise Toppers" tab
- [ ] School dropdown appears (required)
- [ ] Select School → Top 10 for that school display
- [ ] Group filter works
- [ ] Cards show rank within school

---

### 6. Schools Page

#### Data Display
- [ ] Navigate to /dashboard/schools
- [ ] DataGrid loads with schools
- [ ] Columns: Name, District, Address, Medium, Status, Created At, Actions

#### Filters
- [ ] District filter dropdown works
- [ ] Search box filters schools
- [ ] Clear Filters button works

#### Create School
- [ ] Click "Add School" button
- [ ] Drawer/Dialog opens with form
- [ ] Fill: Name (required), District (required), Address, Medium, Status
- [ ] Submit with missing required fields → Validation errors show
- [ ] Fill all required fields → Click "Save"
- [ ] Success message → New school in table

#### Edit School
- [ ] As Admin: Click "Edit" button on row
- [ ] Form pre-fills with school data
- [ ] Change any field
- [ ] Save → Updates in table
- [ ] As Manager: Edit button hidden/disabled

#### Delete School
- [ ] As Admin only: Click "Delete" button
- [ ] Confirmation dialog appears
- [ ] Confirm → School removed
- [ ] As Manager: Delete button hidden/disabled

---

### 7. Districts Page

#### CRUD Operations
- [ ] Navigate to /dashboard/districts
- [ ] Table shows all districts
- [ ] As Manager: Can create new district
- [ ] As Manager: Cannot edit or delete
- [ ] As Admin: Can create, edit, delete
- [ ] Create dialog has fields: Name, Status
- [ ] Edit dialog pre-fills data
- [ ] Delete shows confirmation

---

### 8. Exam Years Page

#### Data Display
- [ ] Navigate to /dashboard/exam-years
- [ ] Table shows exam years with all dates
- [ ] Columns: Year, Reg Open, Reg Close, Exam Date, Result Date, Status

#### Create/Edit (Admin Only)
- [ ] As Admin: "Add Exam Year" button visible
- [ ] Click Add → Form opens
- [ ] Fields: Year, Registration Open Date, Registration Close Date, Exam Date, Result Date, Status
- [ ] All date fields use date pickers
- [ ] Changing Status to "active" shows warning about only one active year
- [ ] Submit → New exam year created
- [ ] Edit works similarly

#### Access Control
- [ ] As Manager: Page shows "Access Denied" or redirect
- [ ] As Admin: Full access

---

### 9. Contacts Page

#### Inbox View
- [ ] Navigate to /dashboard/contacts
- [ ] Table shows contact messages
- [ ] Columns: Name, Email, Subject, Status (chip), Received At, Actions

#### Status Filter
- [ ] Status dropdown: All, New, Responded, Closed
- [ ] Select "New" → Only new messages show
- [ ] Select "Responded" → Only responded messages show

#### View Message
- [ ] Click any row → Right drawer opens
- [ ] Shows: Subject, From (name & email), Message body
- [ ] Status dropdown in drawer
- [ ] Change status → Updates immediately
- [ ] Close drawer

#### Bulk Delete
- [ ] As Admin: Checkboxes appear on rows
- [ ] Select multiple rows
- [ ] "Delete Selected" button appears
- [ ] Click Delete → Confirmation dialog
- [ ] Confirm → Selected messages removed
- [ ] As Manager: No checkboxes/bulk actions

---

### 10. Users Page (Admin Only)

#### Access Control
- [ ] As Manager: Navigate to /dashboard/users → Redirects or Access Denied
- [ ] As Admin: Page loads successfully

#### User List
- [ ] Table shows all users
- [ ] Columns: Name, Email, Role, Created At

#### Create User
- [ ] Click "Create User" button
- [ ] Dialog with fields: Name, Email, Password, Role
- [ ] Validation:
  - [ ] Email must be valid format
  - [ ] Password minimum 8 characters
  - [ ] All fields required
- [ ] Submit → New user created
- [ ] Success message
- [ ] User appears in table

---

### 11. Import/Export Page (Admin Only)

#### Access Control
- [ ] As Manager: Cannot access page
- [ ] As Admin: Page loads

#### Export Section
- [ ] "Export Registrations" button
- [ ] Click → CSV downloads immediately
- [ ] Open CSV → Verify data matches registrations table
- [ ] "Export Results" button
- [ ] Click → CSV downloads with results data

#### Template Download
- [ ] "Download Results Template" button
- [ ] CSV template downloads with headers: registrationId, gk, science, mathematics, logicalReasoning, currentAffairs
- [ ] Can open in Excel/Sheets

#### Import Section
- [ ] "Import Results" area with file input
- [ ] Note: "Registration import not allowed (public API only)" displayed
- [ ] Select CSV file (use template format)
- [ ] File validates on selection
- [ ] Preview table shows:
  - [ ] Valid rows with green checkmark
  - [ ] Invalid rows with red X and error messages
- [ ] "Import Valid Rows" button enabled
- [ ] Click Import:
  - [ ] Progress bar shows
  - [ ] Success count updates
  - [ ] Error count updates (if any)
  - [ ] Completion message

---

### 12. Error Handling

#### Network Errors
- [ ] Stop dev server while on any page
- [ ] Tables show error state (not infinite loading)
- [ ] Form submissions show error message
- [ ] Restart server → Data reloads

#### Validation Errors
- [ ] Submit forms with invalid data
- [ ] Inline error messages appear under fields
- [ ] Form doesn't submit until valid
- [ ] Error messages are user-friendly

#### Permission Errors
- [ ] As Manager, try to delete a school (via browser console/API)
- [ ] 403 error returned
- [ ] Snackbar shows "Unauthorized" message
- [ ] Table/page remains stable

---

### 13. Responsiveness

#### Desktop (1920x1080)
- [ ] All pages display correctly
- [ ] DataGrids utilize full width
- [ ] No horizontal scroll on main content

#### Tablet (768px)
- [ ] Sidebar collapses to hamburger menu
- [ ] DataGrids remain usable
- [ ] Forms stack vertically
- [ ] Filters wrap appropriately

#### Mobile (375px)
- [ ] Hamburger menu works
- [ ] DataGrids scroll horizontally if needed
- [ ] Forms fill width
- [ ] Buttons stack vertically

---

### 14. Performance

#### Initial Load
- [ ] Dashboard Overview loads in < 2 seconds
- [ ] No JS errors in console
- [ ] No hydration errors

#### DataGrid Performance
- [ ] Tables with 100+ rows paginate smoothly
- [ ] Sorting is instant (server-side)
- [ ] Search debounce works (no lag)
- [ ] Filter changes don't freeze UI

#### Form Submissions
- [ ] Submit buttons disable during submission
- [ ] Loading indicators show
- [ ] Success/error feedback within 1 second
- [ ] Optimistic updates where possible

---

### 15. Accessibility

#### Keyboard Navigation
- [ ] Tab through all forms
- [ ] Enter submits forms
- [ ] Esc closes dialogs/drawers
- [ ] DataGrid is keyboard navigable

#### Screen Reader
- [ ] All inputs have labels
- [ ] Dialogs have titles
- [ ] Error messages are announced
- [ ] Tables have proper headers

#### Focus Management
- [ ] Opening dialog focuses first input
- [ ] Closing dialog returns focus to trigger
- [ ] No focus trapped in hidden elements

---

## Bug Report Template

If you find issues during testing, use this format:

**Module**: [e.g., Registrations]
**Step**: [e.g., Payment Update Dialog]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Console Errors**: [Copy any errors]
**Browser**: [Chrome/Firefox/Safari]
**Role**: [Admin/Manager]

---

## Test Status Summary

| Module | Status | Issues |
|--------|--------|--------|
| Dashboard Overview | ⬜ Not Tested | |
| Registrations | ⬜ Not Tested | |
| Results | ⬜ Not Tested | |
| Toppers | ⬜ Not Tested | |
| Schools | ⬜ Not Tested | |
| Districts | ⬜ Not Tested | |
| Exam Years | ⬜ Not Tested | |
| Contacts | ⬜ Not Tested | |
| Users | ⬜ Not Tested | |
| Import/Export | ⬜ Not Tested | |

Legend:
- ⬜ Not Tested
- 🟢 Passed
- 🟡 Partial (with minor issues)
- 🔴 Failed

---

## Quick Verification (5 Minutes)

For a quick smoke test, verify these critical paths:

1. **Login** → Enter credentials → Dashboard loads
2. **Registrations** → Table loads → Search works → Export works
3. **Results** → Table loads → Can add a result
4. **Payment Update** → Select registration → Update payment → Confirms update
5. **Role Access** → As Manager, cannot access Users page
6. **Logout** → Returns to login page

If all 6 pass, core functionality is working.