'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Snackbar,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Divider,
} from '@mui/material';
import { Download, Upload } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { arrayToCSV, downloadCSV, parseCSV } from '@/lib/csv';
import { fetcher } from '@/lib/fetcher';
import dayjs from 'dayjs';

export default function ImportExportPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const handleExportRegistrations = async () => {
    try {
      const response = await fetcher('/api/registrations?limit=10000');
      const registrations = response.data;

      const csvData = registrations.map((reg: any) => ({
        FullName: reg.full_name,
        Email: reg.email,
        Phone: reg.phone,
        Class: reg.class,
        Group: reg.group_type,
        School: reg.schools?.name || '',
        District: reg.schools?.districts?.name || '',
        PaymentStatus: reg.payment_verified ? 'Verified' : 'Pending',
        CreatedAt: dayjs(reg.created_at).format('YYYY-MM-DD'),
      }));

      const csv = arrayToCSV(csvData);
      downloadCSV(csv, `registrations_export_${dayjs().format('YYYY-MM-DD')}.csv`);
      setSnackbar({ open: true, message: 'Registrations exported successfully', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    }
  };

  const handleExportResults = async () => {
    try {
      const response = await fetcher('/api/results?limit=10000');
      const results = response.data;

      const csvData = results.map((result: any) => ({
        Student: result.registrations?.full_name || '',
        Class: result.registrations?.class || '',
        Group: result.registrations?.group_type || '',
        School: result.registrations?.schools?.name || '',
        GK: result.gk,
        Science: result.science,
        Mathematics: result.mathematics,
        LogicalReasoning: result.logical_reasoning,
        CurrentAffairs: result.current_affairs,
        Total: result.total_marks,
        Percentage: result.percentage?.toFixed(2) || '',
        RankGlobal: result.rank_global || '',
        RankSchool: result.rank_school || '',
      }));

      const csv = arrayToCSV(csvData);
      downloadCSV(csv, `results_export_${dayjs().format('YYYY-MM-DD')}.csv`);
      setSnackbar({ open: true, message: 'Results exported successfully', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Export failed', severity: 'error' });
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>, type: 'registrations' | 'results') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('CSV file is empty');
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < rows.length; i++) {
        try {
          if (type === 'registrations') {
            await fetcher('/api/registrations', {
              method: 'POST',
              body: JSON.stringify({
                fullName: rows[i].FullName,
                email: rows[i].Email,
                phone: rows[i].Phone,
                class: parseInt(rows[i].Class),
                groupType: rows[i].Group,
                schoolId: rows[i].SchoolId,
                examYearId: rows[i].ExamYearId,
              }),
            });
          } else {
            await fetcher('/api/results', {
              method: 'POST',
              body: JSON.stringify({
                registrationId: rows[i].RegistrationId,
                gk: parseInt(rows[i].GK),
                science: parseInt(rows[i].Science),
                mathematics: parseInt(rows[i].Mathematics),
                logicalReasoning: parseInt(rows[i].LogicalReasoning),
                currentAffairs: parseInt(rows[i].CurrentAffairs),
              }),
            });
          }
          successCount++;
        } catch (err) {
          errorCount++;
        }
        setImportProgress(((i + 1) / rows.length) * 100);
      }

      setSnackbar({
        open: true,
        message: `Import completed: ${successCount} successful, ${errorCount} failed`,
        severity: errorCount > 0 ? 'warning' : 'success',
      });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Import failed', severity: 'error' });
    } finally {
      setImporting(false);
      setImportProgress(0);
      event.target.value = '';
    }
  };

  if (!isAdmin) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Import / Export</Typography>
        <Alert severity="warning">Only administrators can import and export data.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Import / Export
      </Typography>

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Export Data
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Download all data as CSV files for backup or analysis.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={handleExportRegistrations}
              >
                Export Registrations
              </Button>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={handleExportResults}
              >
                Export Results
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Divider />

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Import Data
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload CSV files to bulk import data. Ensure your CSV has the correct format.
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">Registrations CSV Format:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                FullName, Email, Phone, Class, Group, SchoolId, ExamYearId
              </Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>Results CSV Format:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                RegistrationId, GK, Science, Mathematics, LogicalReasoning, CurrentAffairs
              </Typography>
            </Alert>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<Upload />}
                disabled={importing}
              >
                Import Registrations
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={(e) => handleImportFile(e, 'registrations')}
                />
              </Button>
              <Button
                variant="outlined"
                component="label"
                startIcon={<Upload />}
                disabled={importing}
              >
                Import Results
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={(e) => handleImportFile(e, 'results')}
                />
              </Button>
            </Stack>
            {importing && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Importing... {Math.round(importProgress)}%
                </Typography>
                <LinearProgress variant="determinate" value={importProgress} />
              </Box>
            )}
          </CardContent>
        </Card>

        <Alert severity="warning">
          <Typography variant="body2" fontWeight="bold">Important Notes:</Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Import operations cannot be undone. Always backup data before importing.</li>
            <li>Duplicate entries will be skipped or may cause errors.</li>
            <li>Large files may take several minutes to process.</li>
            <li>Invalid data rows will be skipped and reported in the final summary.</li>
          </ul>
        </Alert>
      </Stack>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
