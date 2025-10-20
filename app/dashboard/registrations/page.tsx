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
  Drawer,
  Typography,
  Chip,
  Stack,
  Snackbar,
  Alert,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useSession } from 'next-auth/react';
import { useQueryState } from '@/hooks/useQueryState';
import { useFetch } from '@/hooks/useFetch';
import DataGridToolbar from '@/components/common/DataGridToolbar';
import { arrayToCSV, downloadCSV } from '@/lib/csv';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';

export default function RegistrationsPage() {
  const { data: session } = useSession();
  const { getQueryParam, clearQueryParams } = useQueryState();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState(getQueryParam('q'));
  const [examYearFilter, setExamYearFilter] = useState(getQueryParam('examYear'));
  const [districtFilter, setDistrictFilter] = useState(getQueryParam('districtId'));
  const [schoolFilter, setSchoolFilter] = useState(getQueryParam('schoolId'));
  const [classFilter, setClassFilter] = useState(getQueryParam('class'));
  const [groupFilter, setGroupFilter] = useState(getQueryParam('group'));

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [offlineReceiptNo, setOfflineReceiptNo] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailReg, setDetailReg] = useState<any>(null);

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

  const { data, error, mutate } = useFetch(`/api/registrations?${queryString}`);
  const { data: examYears } = useFetch('/api/exam-years');
  const { data: districts } = useFetch('/api/public/refs/districts');
  const { data: schools } = useFetch(districtFilter ? `/api/public/refs/schools?districtId=${districtFilter}` : null);

  const handlePaymentUpdate = async () => {
    if (!selectedReg) return;

    setSubmitting(true);
    try {
      await fetcher(`/api/registrations/${selectedReg.id}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentStatus,
          transactionId: transactionId || undefined,
          offlineReceiptNo: offlineReceiptNo || undefined,
          paymentNotes: paymentNotes || undefined,
        }),
      });

      setSnackbar({ open: true, message: 'Payment status updated successfully', severity: 'success' });
      setPaymentDialogOpen(false);
      mutate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to update payment', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (!data?.data) return;

    const csvData = data.data.map((reg: any) => ({
      Name: reg.fullName,
      Class: reg.class,
      Group: reg.groupType,
      District: reg.districts?.name || '',
      School: reg.schools?.name || '',
      RollNo: reg.schoolRollNo,
      PaymentStatus: reg.paymentStatus,
      CreatedAt: dayjs(reg.createdAt).format('YYYY-MM-DD'),
    }));

    const csv = arrayToCSV(csvData);
    downloadCSV(csv, `registrations_${dayjs().format('YYYY-MM-DD')}.csv`);
  };

  const filters: Array<{ label: string; value: string }> = [];
  if (examYearFilter) filters.push({ label: 'Exam Year', value: examYearFilter });
  if (districtFilter) filters.push({ label: 'District', value: districts?.data?.find((d: any) => d.id === districtFilter)?.name || districtFilter });
  if (schoolFilter) filters.push({ label: 'School', value: schools?.data?.find((s: any) => s.id === schoolFilter)?.name || schoolFilter });
  if (classFilter) filters.push({ label: 'Class', value: classFilter });
  if (groupFilter) filters.push({ label: 'Group', value: groupFilter });

  const columns: GridColDef[] = [
    { field: 'fullName', headerName: 'Candidate', width: 200 },
    { field: 'class', headerName: 'Class', width: 80 },
    { field: 'groupType', headerName: 'Group', width: 80 },
    {
      field: 'district',
      headerName: 'District',
      width: 150,
      valueGetter: (value, row) => row.districts?.name || '',
    },
    {
      field: 'school',
      headerName: 'School',
      width: 200,
      valueGetter: (value, row) => row.schools?.name || '',
    },
    { field: 'schoolRollNo', headerName: 'Roll No', width: 100 },
    {
      field: 'paymentStatus',
      headerName: 'Payment',
      width: 120,
      renderCell: (params) => {
        const color = params.value === 'Verified' ? 'success' : params.value === 'Rejected' ? 'error' : 'warning';
        return <Chip label={params.value} color={color} size="small" />;
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      width: 120,
      valueGetter: (value, row) => dayjs(row.createdAt).format('YYYY-MM-DD'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setDetailReg(params.row);
              setDetailDrawerOpen(true);
            }}
          >
            View
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setSelectedReg(params.row);
              setPaymentStatus(params.row.paymentStatus);
              setTransactionId(params.row.transactionId || '');
              setOfflineReceiptNo(params.row.offlineReceiptNo || '');
              setPaymentNotes(params.row.paymentNotes || '');
              setPaymentDialogOpen(true);
            }}
          >
            Payment
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Registrations
      </Typography>

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
                searchPlaceholder="Search by name or roll number..."
              />
            ),
          }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Payment Status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Student Name" value={selectedReg?.fullName || ''} disabled fullWidth />
            <TextField label="Payment Option" value={selectedReg?.paymentOption || ''} disabled fullWidth />
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select value={paymentStatus} label="Payment Status" onChange={(e) => setPaymentStatus(e.target.value)}>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Verified">Verified</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Transaction ID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} fullWidth />
            <TextField label="Offline Receipt No" value={offlineReceiptNo} onChange={(e) => setOfflineReceiptNo(e.target.value)} fullWidth />
            <TextField label="Notes" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} multiline rows={3} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePaymentUpdate} variant="contained" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6" gutterBottom>Registration Details</Typography>
          {detailReg && (
            <Stack spacing={2}>
              <Box><Typography variant="caption" color="text.secondary">Full Name</Typography><Typography>{detailReg.fullName}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Gender</Typography><Typography>{detailReg.gender}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Date of Birth</Typography><Typography>{dayjs(detailReg.dob).format('YYYY-MM-DD')}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Class / Group</Typography><Typography>{detailReg.class} / {detailReg.groupType}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Medium</Typography><Typography>{detailReg.medium}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">District</Typography><Typography>{detailReg.districts?.name}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">School</Typography><Typography>{detailReg.schools?.name}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Roll Number</Typography><Typography>{detailReg.schoolRollNo}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Address</Typography><Typography>{detailReg.address}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Student Mobile</Typography><Typography>{detailReg.studentMobile}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Guardian Mobile</Typography><Typography>{detailReg.guardianMobile}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Email</Typography><Typography>{detailReg.email || 'N/A'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Payment Option</Typography><Typography>{detailReg.paymentOption}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Payment Status</Typography><Chip label={detailReg.paymentStatus} size="small" /></Box>
            </Stack>
          )}
        </Box>
      </Drawer>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
