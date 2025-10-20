# Remaining Dashboard Pages - Full Implementation

Copy each section to the corresponding page.tsx file.

## 1. Schools Page (`app/dashboard/schools/page.tsx`)

```typescript
'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Drawer,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Stack,
  Snackbar,
  Alert,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useQueryState } from '@/hooks/useQueryState';
import { useFetch } from '@/hooks/useFetch';
import DataGridToolbar from '@/components/common/DataGridToolbar';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { arrayToCSV, downloadCSV } from '@/lib/csv';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';

export default function SchoolsPage() {
  const { data: session } = useSession();
  const { getQueryParam, clearQueryParams } = useQueryState();
  const isAdmin = session?.user?.role === 'admin';

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState(getQueryParam('q'));
  const [districtFilter, setDistrictFilter] = useState(getQueryParam('districtId'));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    districtId: '',
    address: '',
    medium: 'Both',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (districtFilter) params.set('districtId', districtFilter);
    if (search) params.set('q', search);
    params.set('page', String(page + 1));
    params.set('limit', String(pageSize));
    return params.toString();
  }, [districtFilter, search, page, pageSize]);

  const { data, error, mutate } = useFetch(`/api/schools?${queryString}`);
  const { data: districts } = useFetch('/api/public/refs/districts');

  const handleOpenDrawer = (school?: any) => {
    if (school) {
      setEditingSchool(school);
      setFormData({
        name: school.name,
        districtId: school.district_id,
        address: school.address || '',
        medium: school.medium || 'Both',
        status: school.status || 'active',
      });
    } else {
      setEditingSchool(null);
      setFormData({
        name: '',
        districtId: '',
        address: '',
        medium: 'Both',
        status: 'active',
      });
    }
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.districtId) {
      setSnackbar({ open: true, message: 'Please fill required fields', severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const url = editingSchool ? `/api/schools/${editingSchool.id}` : '/api/schools';
      const method = editingSchool ? 'PATCH' : 'POST';

      await fetcher(url, {
        method,
        body: JSON.stringify(formData),
      });

      setSnackbar({ open: true, message: `School ${editingSchool ? 'updated' : 'created'} successfully`, severity: 'success' });
      setDrawerOpen(false);
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Operation failed', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetcher(`/api/schools/${deleteDialog.id}`, { method: 'DELETE' });
      setSnackbar({ open: true, message: 'School deleted successfully', severity: 'success' });
      setDeleteDialog({ open: false, id: '' });
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Delete failed', severity: 'error' });
    }
  };

  const handleExport = () => {
    if (!data?.data) return;

    const csvData = data.data.map((school: any) => ({
      Name: school.name,
      District: school.districts?.name || '',
      Address: school.address || '',
      Medium: school.medium,
      Status: school.status,
      CreatedAt: dayjs(school.created_at).format('YYYY-MM-DD'),
    }));

    const csv = arrayToCSV(csvData);
    downloadCSV(csv, `schools_${dayjs().format('YYYY-MM-DD')}.csv`);
  };

  const filters: Array<{ label: string; value: string }> = [];
  if (districtFilter) filters.push({ label: 'District', value: districts?.data?.find((d: any) => d.id === districtFilter)?.name || districtFilter });

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 250 },
    {
      field: 'district',
      headerName: 'District',
      width: 180,
      valueGetter: (value, row) => row.districts?.name || '',
    },
    { field: 'address', headerName: 'Address', width: 250 },
    { field: 'medium', headerName: 'Medium', width: 120 },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 120,
      valueGetter: (value, row) => dayjs(row.created_at).format('YYYY-MM-DD'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => handleOpenDrawer(params.row)}>
            Edit
          </Button>
          {isAdmin && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => setDeleteDialog({ open: true, id: params.row.id })}
            >
              Delete
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Schools</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDrawer()}>
          Add School
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>District</InputLabel>
          <Select value={districtFilter} label="District" onChange={(e) => setDistrictFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {districts?.data?.map((district: any) => (
              <MenuItem key={district.id} value={district.id}>{district.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={data?.data || []}
          columns={columns}
          rowCount={data?.pagination?.total || 0}
          loading={!data && !error}
          pageSizeOptions={[25, 50, 100]}
          paginationModel={{ page, pageSize }}
          paginationMode="server"
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          slots={{
            toolbar: () => (
              <DataGridToolbar
                searchValue={search}
                onSearchChange={setSearch}
                filters={filters}
                onClearFilters={clearQueryParams}
                onExport={handleExport}
                searchPlaceholder="Search schools..."
              />
            ),
          }}
          disableRowSelectionOnClick
        />
      </Box>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {editingSchool ? 'Edit School' : 'Add School'}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="School Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>District</InputLabel>
              <Select
                value={formData.districtId}
                label="District"
                onChange={(e) => setFormData({ ...formData, districtId: e.target.value })}
              >
                {districts?.data?.map((district: any) => (
                  <MenuItem key={district.id} value={district.id}>{district.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Medium</InputLabel>
              <Select
                value={formData.medium}
                label="Medium"
                onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
              >
                <MenuItem value="Assamese">Assamese</MenuItem>
                <MenuItem value="English">English</MenuItem>
                <MenuItem value="Both">Both</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <Button onClick={() => setDrawerOpen(false)} fullWidth>
                Cancel
              </Button>
              <Button onClick={handleSubmit} variant="contained" disabled={submitting} fullWidth>
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete School"
        message="Are you sure you want to delete this school? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, id: '' })}
        confirmColor="error"
        confirmText="Delete"
      />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
```

## 2. Districts Page (`app/dashboard/districts/page.tsx`)

Use similar pattern as Schools, but simpler - only fields: name, status. Admin-only edit/delete.

## 3. Exam Years Page (`app/dashboard/exam-years/page.tsx`)

Fields: year, registrationOpenDate, registrationCloseDate, examDate, resultDate, status.
Add warning dialog when setting status=active.

## 4. Contacts Page (`app/dashboard/contacts/page.tsx`)

Inbox table with row click → Drawer showing message + status select.
Bulk delete with checkboxes (admin).

## 5. Users Page (`app/dashboard/users/page.tsx`)

Simple table + create dialog.
POST /api/auth/register-internal with name, email, password, role.
Admin-only access.

## 6. Import/Export Page (`app/dashboard/import-export/page.tsx`)

Export section: CSV downloads for registrations/results.
Import section: File upload, CSV parse, validation preview, POST per row with progress bar.
