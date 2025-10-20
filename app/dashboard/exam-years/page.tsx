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
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { arrayToCSV, downloadCSV } from '@/lib/csv';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';

export default function ExamYearsPage() {
  const { data: session } = useSession();
  const { getQueryParam, clearQueryParams } = useQueryState();
  const isAdmin = session?.user?.role === 'admin';

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState(getQueryParam('q'));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<any>(null);
  const [formData, setFormData] = useState({
    year: '',
    registrationOpenDate: '',
    registrationCloseDate: '',
    examDate: '',
    resultDate: '',
    status: 'archived',
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeWarning, setActiveWarning] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    params.set('page', String(page + 1));
    params.set('limit', String(pageSize));
    return params.toString();
  }, [search, page, pageSize]);

  const { data, error, mutate } = useFetch(`/api/exam-years?${queryString}`);

  const handleOpenDialog = (year?: any) => {
    if (year) {
      setEditingYear(year);
      setFormData({
        year: year.year,
        registrationOpenDate: dayjs(year.registrationOpenDate).format('YYYY-MM-DD'),
        registrationCloseDate: dayjs(year.registrationCloseDate).format('YYYY-MM-DD'),
        examDate: dayjs(year.examDate).format('YYYY-MM-DD'),
        resultDate: year.resultDate ? dayjs(year.resultDate).format('YYYY-MM-DD') : '',
        status: year.status,
      });
    } else {
      setEditingYear(null);
      setFormData({
        year: new Date().getFullYear().toString(),
        registrationOpenDate: '',
        registrationCloseDate: '',
        examDate: '',
        resultDate: '',
        status: 'archived',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.year || !formData.registrationOpenDate || !formData.registrationCloseDate || !formData.examDate) {
      setSnackbar({ open: true, message: 'Please fill all required fields', severity: 'error' });
      return;
    }

    if (formData.status === 'active' && !editingYear) {
      setActiveWarning(true);
      return;
    }

    setSubmitting(true);
    try {
      const url = editingYear ? `/api/exam-years/${editingYear.id}` : '/api/exam-years';
      const method = editingYear ? 'PATCH' : 'POST';

      await fetcher(url, {
        method,
        body: JSON.stringify({
          ...formData,
          year: Number(formData.year), // ✅ ensure number
        }),
      });


      setSnackbar({ open: true, message: `Exam year ${editingYear ? 'updated' : 'created'} successfully`, severity: 'success' });
      setDialogOpen(false);
      setActiveWarning(false);
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Operation failed', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetcher(`/api/exam-years/${deleteDialog.id}`, { method: 'DELETE' });
      setSnackbar({ open: true, message: 'Exam year deleted successfully', severity: 'success' });
      setDeleteDialog({ open: false, id: '' });
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Delete failed', severity: 'error' });
    }
  };

  const handleExport = () => {
    if (!data?.data) return;

    const csvData = data.data.map((year: any) => ({
      Year: year.year,
      RegOpen: dayjs(year.registrationOpenDate).format('YYYY-MM-DD'),
      RegClose: dayjs(year.registrationCloseDate).format('YYYY-MM-DD'),
      ExamDate: dayjs(year.examDate).format('YYYY-MM-DD'),
      ResultDate: year.resultDate ? dayjs(year.resultDate).format('YYYY-MM-DD') : '',
      Status: year.status,
    }));

    const csv = arrayToCSV(csvData);
    downloadCSV(csv, `exam_years_${dayjs().format('YYYY-MM-DD')}.csv`);
  };

  const columns: GridColDef[] = [
    { field: 'year', headerName: 'Year', width: 100 },
    {
      field: 'registrationOpenDate',
      headerName: 'Reg. Open',
      width: 120,
      valueGetter: (value, row) => dayjs(row.registrationOpenDate).format('YYYY-MM-DD'),
    },
    {
      field: 'registrationCloseDate',
      headerName: 'Reg. Close',
      width: 120,
      valueGetter: (value, row) => dayjs(row.registrationCloseDate).format('YYYY-MM-DD'),
    },
    {
      field: 'examDate',
      headerName: 'Exam Date',
      width: 120,
      valueGetter: (value, row) => dayjs(row.examDate).format('YYYY-MM-DD'),
    },
    {
      field: 'resultDate',
      headerName: 'Result Date',
      width: 120,
      valueGetter: (value, row) => row.resultDate ? dayjs(row.resultDate).format('YYYY-MM-DD') : '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.status}
          color={params.row.status === 'active' ? 'success' : params.row.status === 'completed' ? 'default' : 'warning'}
          size="small"
        />
      ),
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

  if (!isAdmin) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Exam Years Management</Typography>
        <Alert severity="warning">Only administrators can manage exam years.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Exam Years Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Add Exam Year
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
                searchPlaceholder="Search years..."
              />
            ),
          }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingYear ? 'Edit Exam Year' : 'Add Exam Year'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              type='number'
              label="Year"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Registration Open Date"
              type="date"
              value={formData.registrationOpenDate}
              onChange={(e) => setFormData({ ...formData, registrationOpenDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
            <TextField
              label="Registration Close Date"
              type="date"
              value={formData.registrationCloseDate}
              onChange={(e) => setFormData({ ...formData, registrationCloseDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
            <TextField
              label="Exam Date"
              type="date"
              value={formData.examDate}
              onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
            <TextField
              label="Result Date (Optional)"
              type="date"
              value={formData.resultDate}
              onChange={(e) => setFormData({ ...formData, resultDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
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
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
            {formData.status === 'active' && (
              <Alert severity="warning">
                Setting status to Active will make this the current exam year for new registrations.
              </Alert>
            )}
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
        open={activeWarning}
        title="Set as Active Year?"
        message="Setting this as active will make it the current year for new registrations. Other active years will be set to completed. Continue?"
        onConfirm={handleSubmit}
        onCancel={() => setActiveWarning(false)}
        confirmColor="warning"
        confirmText="Confirm"
      />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Exam Year"
        message="Are you sure you want to delete this exam year? This will affect all related registrations and results."
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
