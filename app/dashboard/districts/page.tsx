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

export default function DistrictsPage() {
  const { data: session } = useSession();
  const { getQueryParam, clearQueryParams } = useQueryState();
  const isAdmin = session?.user?.role === 'admin';

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState(getQueryParam('q'));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    params.set('page', String(page + 1));
    params.set('limit', String(pageSize));
    return params.toString();
  }, [search, page, pageSize]);

  const { data, error, mutate } = useFetch(`/api/districts?${queryString}`);

  const handleOpenDialog = (district?: any) => {
    if (district) {
      setEditingDistrict(district);
      setFormData({
        name: district.name,
        status: district.status || 'active',
      });
    } else {
      setEditingDistrict(null);
      setFormData({
        name: '',
        status: 'active',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      setSnackbar({ open: true, message: 'District name is required', severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const url = editingDistrict ? `/api/districts/${editingDistrict.id}` : '/api/districts';
      const method = editingDistrict ? 'PATCH' : 'POST';

      await fetcher(url, {
        method,
        body: JSON.stringify(formData),
      });

      setSnackbar({ open: true, message: `District ${editingDistrict ? 'updated' : 'created'} successfully`, severity: 'success' });
      setDialogOpen(false);
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Operation failed', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetcher(`/api/districts/${deleteDialog.id}`, { method: 'DELETE' });
      setSnackbar({ open: true, message: 'District deleted successfully', severity: 'success' });
      setDeleteDialog({ open: false, id: '' });
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Delete failed', severity: 'error' });
    }
  };

  const handleExport = () => {
    if (!data?.data) return;

    const csvData = data.data.map((district: any) => ({
      Name: district.name,
      Status: district.status,
      CreatedAt: dayjs(district.created_at).format('YYYY-MM-DD'),
    }));

    const csv = arrayToCSV(csvData);
    downloadCSV(csv, `districts_${dayjs().format('YYYY-MM-DD')}.csv`);
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 300 },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      valueGetter: (value, row) => row.status === 'active' ? 'Active' : 'Inactive',
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 150,
      valueGetter: (value, row) => dayjs(row.created_at).format('YYYY-MM-DD'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          {isAdmin && (
            <>
              <Button size="small" variant="outlined" onClick={() => handleOpenDialog(params.row)}>
                Edit
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => setDeleteDialog({ open: true, id: params.row.id })}
              >
                Delete
              </Button>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Districts Management</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add District
          </Button>
        )}
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
                searchPlaceholder="Search districts..."
              />
            ),
          }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingDistrict ? 'Edit District' : 'Add District'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="District Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete District"
        message="Are you sure you want to delete this district? This will affect all schools in this district."
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
