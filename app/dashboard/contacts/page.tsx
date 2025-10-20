'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Drawer,
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
import { useSession } from 'next-auth/react';
import { useQueryState } from '@/hooks/useQueryState';
import { useFetch } from '@/hooks/useFetch';
import DataGridToolbar from '@/components/common/DataGridToolbar';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { arrayToCSV, downloadCSV } from '@/lib/csv';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';

export default function ContactsPage() {
  const { data: session } = useSession();
  const { getQueryParam, clearQueryParams } = useQueryState();
  const isAdmin = session?.user?.role === 'admin';

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState(getQueryParam('q'));
  const [statusFilter, setStatusFilter] = useState(getQueryParam('status') || '');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [statusUpdate, setStatusUpdate] = useState('');

  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('q', search);
    params.set('page', String(page + 1));
    params.set('limit', String(pageSize));
    return params.toString();
  }, [statusFilter, search, page, pageSize]);

  const { data, error, mutate } = useFetch(`/api/contacts?${queryString}`);

  const handleOpenDrawer = (contact: any) => {
    setSelectedContact(contact);
    setStatusUpdate(contact.status);
    setDrawerOpen(true);
  };

  const handleStatusUpdate = async () => {
    try {
      await fetcher(`/api/contacts/${selectedContact.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusUpdate }),
      });
      setSnackbar({ open: true, message: 'Status updated successfully', severity: 'success' });
      setDrawerOpen(false);
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Update failed', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await fetcher(`/api/contacts/${deleteDialog.id}`, { method: 'DELETE' });
      setSnackbar({ open: true, message: 'Contact deleted successfully', severity: 'success' });
      setDeleteDialog({ open: false, id: '' });
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Delete failed', severity: 'error' });
    }
  };

  const handleExport = () => {
    if (!data?.data) return;

    const csvData = data.data.map((contact: any) => ({
      Name: contact.name,
      Email: contact.email,
      Phone: contact.phone || '',
      Subject: contact.subject,
      Message: contact.message,
      Status: contact.status,
      CreatedAt: dayjs(contact.created_at).format('YYYY-MM-DD HH:mm'),
    }));

    const csv = arrayToCSV(csvData);
    downloadCSV(csv, `contacts_${dayjs().format('YYYY-MM-DD')}.csv`);
  };

  const filters: Array<{ label: string; value: string }> = [];
  if (statusFilter) filters.push({ label: 'Status', value: statusFilter });

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'subject', headerName: 'Subject', width: 250 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.status}
          color={params.row.status === 'unread' ? 'error' : params.row.status === 'read' ? 'warning' : 'success'}
          size="small"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Received',
      width: 150,
      valueGetter: (value, row) => dayjs(row.created_at).format('YYYY-MM-DD HH:mm'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => handleOpenDrawer(params.row)}>
            View
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
        <Typography variant="h4">Contact Messages</Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="new">New</MenuItem>
            <MenuItem value="read">Read</MenuItem>
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
                searchPlaceholder="Search contacts..."
              />
            ),
          }}
          disableRowSelectionOnClick
        />
      </Box>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 450, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Contact Details
          </Typography>
          {selectedContact && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Name
                </Typography>
                <Typography>{selectedContact.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography>{selectedContact.email}</Typography>
              </Box>
              {selectedContact.phone && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography>{selectedContact.phone}</Typography>
                </Box>
              )}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Subject
                </Typography>
                <Typography>{selectedContact.subject}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Message
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{selectedContact.message}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Received
                </Typography>
                <Typography>{dayjs(selectedContact.created_at).format('YYYY-MM-DD HH:mm')}</Typography>
              </Box>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={statusUpdate} label="Status" onChange={(e) => setStatusUpdate(e.target.value)}>
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="read">Read</MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <Button onClick={() => setDrawerOpen(false)} fullWidth>
                  Close
                </Button>
                <Button onClick={handleStatusUpdate} variant="contained" fullWidth>
                  Update Status
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Drawer>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Contact"
        message="Are you sure you want to delete this contact message?"
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
