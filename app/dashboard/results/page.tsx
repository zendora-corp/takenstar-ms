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
  Chip,
  Stack,
  Snackbar,
  Alert,
  Autocomplete,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQueryState } from '@/hooks/useQueryState';
import { useFetch } from '@/hooks/useFetch';
import DataGridToolbar from '@/components/common/DataGridToolbar';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { arrayToCSV, downloadCSV } from '@/lib/csv';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';

export default function ResultsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { getQueryParam, clearQueryParams } = useQueryState();
  const isAdmin = session?.user?.role === 'admin';

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState(getQueryParam('q'));
  const [examYearFilter, setExamYearFilter] = useState(getQueryParam('examYear'));
  const [districtFilter, setDistrictFilter] = useState(getQueryParam('districtId'));
  const [schoolFilter, setSchoolFilter] = useState(getQueryParam('schoolId'));
  const [classFilter, setClassFilter] = useState(getQueryParam('class'));
  const [groupFilter, setGroupFilter] = useState(getQueryParam('group'));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    registrationId: '',
    gk: 0,
    science: 0,
    mathematics: 0,
    logicalReasoning: 0,
    currentAffairs: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (examYearFilter) params.set('examYear', examYearFilter);
    if (districtFilter) params.set('districtId', districtFilter);
    if (schoolFilter) params.set('schoolId', schoolFilter);
    if (classFilter) params.set('class', classFilter);
    if (groupFilter) params.set('group', groupFilter);
    if (search) params.set('q', search);
    params.set('page', String(page + 1));
    params.set('limit', String(pageSize));
    return params.toString();
  }, [examYearFilter, districtFilter, schoolFilter, classFilter, groupFilter, search, page, pageSize]);

  const { data, error, mutate } = useFetch(`/api/results?${queryString}`);
  const { data: examYears } = useFetch('/api/exam-years');
  const { data: districts } = useFetch('/api/public/refs/districts');
  const { data: schools } = useFetch(districtFilter ? `/api/public/refs/schools?districtId=${districtFilter}` : null);
  const { data: registrations } = useFetch('/api/registrations?limit=500');

  const total = formData.gk + formData.science + formData.mathematics + formData.logicalReasoning + formData.currentAffairs;
  const percentage = total > 0 ? ((total / 500) * 100).toFixed(2) : '0.00';

  const handleOpenDialog = (result?: any) => {
    if (result) {
      setEditingResult(result);
      setFormData({
        registrationId: result.registrationId,
        gk: result.gk,
        science: result.science,
        mathematics: result.mathematics,
        logicalReasoning: result.logicalReasoning,
        currentAffairs: result.currentAffairs,
      });
    } else {
      setEditingResult(null);
      setFormData({
        registrationId: '',
        gk: 0,
        science: 0,
        mathematics: 0,
        logicalReasoning: 0,
        currentAffairs: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const url = editingResult ? `/api/results/${editingResult.id}` : '/api/results';
      const method = editingResult ? 'PATCH' : 'POST';

      await fetcher(url, {
        method,
        body: JSON.stringify(formData),
      });

      setSnackbar({ open: true, message: `Result ${editingResult ? 'updated' : 'created'} successfully`, severity: 'success' });
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
      await fetcher(`/api/results/${deleteDialog.id}`, { method: 'DELETE' });
      setSnackbar({ open: true, message: 'Result deleted successfully', severity: 'success' });
      setDeleteDialog({ open: false, id: '' });
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Delete failed', severity: 'error' });
    }
  };

  const handleExport = () => {
    if (!data?.data) return;

    const csvData = data.data.map((result: any) => ({
      Student: result.registrations?.fullName || '',
      Class: result.registrations?.class || '',
      Group: result.registrations?.groupType || '',
      GK: result.gk,
      Science: result.science,
      Math: result.mathematics,
      Logical: result.logicalReasoning,
      CurrentAffairs: result.currentAffairs,
      Total: result.total_marks,
      Percentage: result.percentage,
      RankGlobal: result.rankGlobal,
      RankSchool: result.rankSchool,
    }));

    const csv = arrayToCSV(csvData);
    downloadCSV(csv, `results_${dayjs().format('YYYY-MM-DD')}.csv`);
  };

  const filters: Array<{ label: string; value: string }> = [];
  if (examYearFilter) filters.push({ label: 'Exam Year', value: examYearFilter });
  if (districtFilter) filters.push({ label: 'District', value: districts?.data?.find((d: any) => d.id === districtFilter)?.name || districtFilter });
  if (schoolFilter) filters.push({ label: 'School', value: schools?.data?.find((s: any) => s.id === schoolFilter)?.name || schoolFilter });
  if (classFilter) filters.push({ label: 'Class', value: classFilter });
  if (groupFilter) filters.push({ label: 'Group', value: groupFilter });

  const columns: GridColDef[] = [
    {
      field: 'candidate',
      headerName: 'Candidate',
      width: 180,
      valueGetter: (value, row) => row.registrations?.fullName || '',
    },
    {
      field: 'class',
      headerName: 'Class',
      width: 70,
      valueGetter: (value, row) => row.registrations?.class || '',
    },
    {
      field: 'group',
      headerName: 'Group',
      width: 70,
      valueGetter: (value, row) => row.registrations?.groupType || '',
    },
    { field: 'gk', headerName: 'GK', width: 60 },
    { field: 'science', headerName: 'Science', width: 80 },
    { field: 'mathematics', headerName: 'Math', width: 60 },
    { field: 'logicalReasoning', headerName: 'Logical', width: 80 },
    { field: 'currentAffairs', headerName: 'Current Affairs', width: 100 },
    { field: 'total', headerName: 'Total', width: 70 },
    {
      field: 'percentage',
      headerName: '%',
      width: 70,
      valueGetter: (value, row) => row.percentage?.toFixed(2) || '0',
    },
    { field: 'rankGlobal', headerName: 'Rank (G)', width: 90 },
    { field: 'rankSchool', headerName: 'Rank (S)', width: 90 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => handleOpenDialog(params.row)}>
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
        <Typography variant="h4">Results Management</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Result
          </Button>
          <Button variant="outlined" onClick={() => router.push('/dashboard/toppers')}>
            View Toppers
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Exam Year</InputLabel>
          <Select value={examYearFilter} label="Exam Year" onChange={(e) => setExamYearFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {examYears?.data?.map((year: any) => (
              <MenuItem key={year.id} value={year.id}>{year.year}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>District</InputLabel>
          <Select value={districtFilter} label="District" onChange={(e) => { setDistrictFilter(e.target.value); setSchoolFilter(''); }}>
            <MenuItem value="">All</MenuItem>
            {districts?.data?.map((district: any) => (
              <MenuItem key={district.id} value={district.id}>{district.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>School</InputLabel>
          <Select value={schoolFilter} label="School" onChange={(e) => setSchoolFilter(e.target.value)} disabled={!districtFilter}>
            <MenuItem value="">All</MenuItem>
            {schools?.data?.map((school: any) => (
              <MenuItem key={school.id} value={school.id}>{school.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Class</InputLabel>
          <Select value={classFilter} label="Class" onChange={(e) => setClassFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {[6, 7, 8, 9, 10, 11, 12].map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Group</InputLabel>
          <Select value={groupFilter} label="Group" onChange={(e) => setGroupFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="A">A</MenuItem>
            <MenuItem value="B">B</MenuItem>
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
                searchPlaceholder="Search by student name..."
              />
            ),
          }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingResult ? 'Edit Result' : 'Add Result'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={registrations?.data || []}
              getOptionLabel={(option: any) => `${option.fullName} (${option.class}-${option.groupType}) - ${option.schools?.name}`}
              value={registrations?.data?.find((r: any) => r.id === formData.registrationId) || null}
              onChange={(e, value) => setFormData({ ...formData, registrationId: value?.id || '' })}
              renderInput={(params) => <TextField {...params} label="Select Student" required />}
              disabled={!!editingResult}
            />

            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
              <TextField
                label="General Knowledge (0-100)"
                type="number"
                value={formData.gk}
                onChange={(e) => setFormData({ ...formData, gk: Math.max(0, Math.min(100, Number(e.target.value))) })}
                inputProps={{ min: 0, max: 100 }}
                fullWidth
              />
              <TextField
                label="Science (0-100)"
                type="number"
                value={formData.science}
                onChange={(e) => setFormData({ ...formData, science: Math.max(0, Math.min(100, Number(e.target.value))) })}
                inputProps={{ min: 0, max: 100 }}
                fullWidth
              />
              <TextField
                label="Mathematics (0-100)"
                type="number"
                value={formData.mathematics}
                onChange={(e) => setFormData({ ...formData, mathematics: Math.max(0, Math.min(100, Number(e.target.value))) })}
                inputProps={{ min: 0, max: 100 }}
                fullWidth
              />
              <TextField
                label="Logical Reasoning (0-100)"
                type="number"
                value={formData.logicalReasoning}
                onChange={(e) => setFormData({ ...formData, logicalReasoning: Math.max(0, Math.min(100, Number(e.target.value))) })}
                inputProps={{ min: 0, max: 100 }}
                fullWidth
              />
              <TextField
                label="Current Affairs (0-100)"
                type="number"
                value={formData.currentAffairs}
                onChange={(e) => setFormData({ ...formData, currentAffairs: Math.max(0, Math.min(100, Number(e.target.value))) })}
                inputProps={{ min: 0, max: 100 }}
                fullWidth
              />
            </Box>

            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="h6">Preview</Typography>
              <Typography>Total: {total} / 500</Typography>
              <Typography>Percentage: {percentage}%</Typography>
              <Typography variant="caption" color="text.secondary">
                Final total and percentage will be calculated by the server.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting || !formData.registrationId}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Result"
        message="Are you sure you want to delete this result? This action cannot be undone."
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
