'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Stack,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useQueryState } from '@/hooks/useQueryState';
import { useFetch } from '@/hooks/useFetch';
import DataGridToolbar from '@/components/common/DataGridToolbar';
import { arrayToCSV, downloadCSV } from '@/lib/csv';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';

export default function UsersPage() {
  const { data: session } = useSession();
  const { getQueryParam, clearQueryParams } = useQueryState();
  const isAdmin = session?.user?.role === 'admin';

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState(getQueryParam('q'));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager',
  });
  const [submitting, setSubmitting] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    params.set('page', String(page + 1));
    params.set('limit', String(pageSize));
    return params.toString();
  }, [search, page, pageSize]);

  const { data, error, mutate } = useFetch(`/api/users?${queryString}`);

  const handleOpenDialog = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'manager',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setSnackbar({ open: true, message: 'Please fill all fields', severity: 'error' });
      return;
    }

    if (formData.password.length < 8) {
      setSnackbar({ open: true, message: 'Password must be at least 8 characters', severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await fetcher('/api/auth/register-internal', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setSnackbar({ open: true, message: 'User created successfully', severity: 'success' });
      setDialogOpen(false);
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Create failed', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (!data?.data) return;

    const csvData = data.data.map((user: any) => ({
      Name: user.name,
      Email: user.email,
      Role: user.role,
      CreatedAt: dayjs(user.created_at).format('YYYY-MM-DD'),
    }));

    const csv = arrayToCSV(csvData);
    downloadCSV(csv, `users_${dayjs().format('YYYY-MM-DD')}.csv`);
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 250 },
    { field: 'email', headerName: 'Email', width: 300 },
    {
      field: 'role',
      headerName: 'Role',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.row.role}
          color={params.row.role === 'admin' ? 'error' : 'primary'}
          size="small"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 150,
      valueGetter: (value, row) => dayjs(row.created_at).format('YYYY-MM-DD'),
    },
  ];

  if (!isAdmin) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>User Management</Typography>
        <Alert severity="warning">Only administrators can manage users.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">User Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenDialog}>
          Create User
        </Button>
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
                filters={[]}
                onClearFilters={clearQueryParams}
                onExport={handleExport}
                searchPlaceholder="Search users..."
              />
            ),
          }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              fullWidth
              helperText="Minimum 8 characters"
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <Alert severity="info">
              Managers can create and edit data. Admins have full access including delete operations.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
