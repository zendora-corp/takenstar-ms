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
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { arrayToCSV, downloadCSV } from '@/lib/csv';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';

type SearchBy = 'name' | 'area' | 'district';

export default function SchoolsPage() {
  const { data: session } = useSession();
  const { getQueryParam, clearQueryParams } = useQueryState();
  const isAdmin = session?.user?.role === 'admin';

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Search UI state
  const initialQ = (getQueryParam('q') as string) || '';
  const initialBy = (getQueryParam('searchBy') as SearchBy) || 'name';
  const [searchBy, setSearchBy] = useState<SearchBy>(initialBy);
  const [search, setSearch] = useState(initialQ);          // actual applied q
  const [searchInput, setSearchInput] = useState(initialQ); // text field

  // District mapping + applied district filter (ID)
  const { data: districtsResp } = useFetch('/api/districts');
  const districts: Array<{ id: string; name: string }> = districtsResp?.data || [];
  const [districtIdFilter, setDistrictIdFilter] = useState<string>('');

  // Drawer / form
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    districtId: '',
    address: '', // UI shows "Area"; keeping key until backend changes
    medium: 'Both',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as any,
  });

  // Build query string — uses either q or districtIdFilter
  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (districtIdFilter) {
      params.set('districtId', districtIdFilter);
      params.set('searchBy', 'district');
    } else if (search) {
      params.set('q', search);
      params.set('searchBy', searchBy);
      if (searchBy === 'area') {
        // back-compat if API still accepts address text filter
        params.set('address', search);
      }
    }

    params.set('page', String(page + 1));
    params.set('limit', String(pageSize));
    return params.toString();
  }, [districtIdFilter, search, searchBy, page, pageSize]);

  const { data, error, mutate } = useFetch(`/api/schools?${queryString}`);

  // ---------- Search apply logic ----------
  const resolveDistrictId = (term: string): { id: string | ''; reason?: string } => {
    if (!districts?.length) return { id: '', reason: 'loading' };

    const s = term.trim().toLowerCase();
    if (!s) return { id: '', reason: 'empty' };

    const exact = districts.find(d => d.name.trim().toLowerCase() === s);
    if (exact) return { id: exact.id };

    const partials = districts.filter(d => d.name.toLowerCase().includes(s));
    if (partials.length === 1) return { id: partials[0].id };
    if (partials.length === 0) return { id: '', reason: 'no_match' };
    return { id: '', reason: 'ambiguous' };
  };

  const applySearch = () => {
    // District search: map to ID and use districtIdFilter only
    if (searchBy === 'district') {
      const { id, reason } = resolveDistrictId(searchInput);
      if (!id) {
        let message = 'Unable to resolve district.';
        if (reason === 'loading') message = 'District list is still loading. Please try again.';
        if (reason === 'no_match') message = 'No district matched your input.';
        if (reason === 'ambiguous') message = 'Multiple districts matched. Please type a more specific name.';
        if (reason === 'empty') message = 'Please type a district name.';

        setSnackbar({ open: true, message, severity: 'error' });
        return;
      }
      setDistrictIdFilter(id);
      setSearch(''); // ensure q is not sent
      setPage(0);
      return;
    }

    // Name / Area: clear district filter and set q
    setDistrictIdFilter('');
    setSearch(searchInput.trim());
    setPage(0);
  };

  const clearAll = () => {
    setSearch('');
    setSearchInput('');
    setSearchBy('name');
    setDistrictIdFilter('');
    setPage(0);
    clearQueryParams();
  };

  // ---------- CRUD + UI handlers ----------
  const handleOpenDrawer = (school?: any) => {
    if (school) {
      setEditingSchool(school);
      setFormData({
        name: school.name,
        districtId: school.districtId,
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

      setSnackbar({
        open: true,
        message: `School ${editingSchool ? 'updated' : 'created'} successfully`,
        severity: 'success',
      });
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
      Area: school.address || '',
      Medium: school.medium,
      Status: school.status,
      CreatedAt: dayjs(school.created_at).format('YYYY-MM-DD'),
    }));

    const csv = arrayToCSV(csvData);
    downloadCSV(csv, `schools_${dayjs().format('YYYY-MM-DD')}.csv`);
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 250 },
    {
      field: 'district',
      headerName: 'District',
      width: 180,
      valueGetter: (value, row) => row.districts?.name || '',
    },
    { field: 'address', headerName: 'Area', width: 250, valueGetter: (v, r) => r.address || '' },
    { field: 'medium', headerName: 'Medium', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      valueGetter: (value, row) => (row.status === 'active' ? 'Active' : 'Inactive'),
    },
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
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Schools Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDrawer()}>
          Add School
        </Button>
      </Box>

      {/* Single Search + "Search by" selector */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Search by</InputLabel>
          <Select
            value={searchBy}
            label="Search by"
            onChange={(e) => setSearchBy(e.target.value as SearchBy)}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="area">Area</MenuItem>
            <MenuItem value="district">District</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder={
            searchBy === 'name'
              ? 'Search by school name…'
              : searchBy === 'area'
              ? 'Search by area…'
              : 'Type district name…'
          }
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
          sx={{ minWidth: 300 }}
        />

        <Button variant="contained" onClick={applySearch}>
          Search
        </Button>
        <Button variant="text" onClick={clearAll}>
          Clear
        </Button>

        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" onClick={handleExport}>
          Export CSV
        </Button>
      </Box>

      {/* Grid */}
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
          disableRowSelectionOnClick
        />
      </Box>

      {/* Create/Edit Drawer */}
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
                {districts.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Area (formerly Address) */}
            <TextField
              label="Area"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              multiline
              rows={2}
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

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete School"
        message="Are you sure you want to delete this school? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, id: '' })}
        confirmColor="error"
        confirmText="Delete"
      />

      {/* Snackbars */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
