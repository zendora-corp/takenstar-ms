'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Avatar,
  Stack,
  Grid,
  CircularProgress,
} from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';
import { useFetch } from '@/hooks/useFetch';
import { useQueryState } from '@/hooks/useQueryState';

export default function ToppersPage() {
  const { getQueryParam } = useQueryState();
  const [tab, setTab] = useState(0);
  const [examYearFilter, setExamYearFilter] = useState(getQueryParam('examYear') || '');
  const [classFilter, setClassFilter] = useState(getQueryParam('class') || '');
  const [groupFilter, setGroupFilter] = useState(getQueryParam('group') || '');
  const [schoolFilter, setSchoolFilter] = useState('');

  const { data: examYears } = useFetch('/api/exam-years');

  const globalQuery = `examYear=${examYearFilter}&class=${classFilter}&group=${groupFilter}`;
  const { data: globalToppers, isLoading: globalLoading } = useFetch(
    `/api/results/toppers/global?${globalQuery}`
  );

  const schoolQuery = schoolFilter
    ? `schoolId=${schoolFilter}&examYear=${examYearFilter}&class=${classFilter}&group=${groupFilter}`
    : null;
  const { data: schoolToppers, isLoading: schoolLoading } = useFetch(
    schoolQuery ? `/api/results/toppers/school?${schoolQuery}` : null
  );

  const { data: schools } = useFetch('/api/schools?limit=500');

  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  const renderTopper = (topper: any, index: number) => (
    <Grid size={{ xs: 12, md: 6 }} key={topper.id}>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            {index < 3 && (
              <EmojiEvents sx={{ fontSize: 40, color: medalColors[index] }} />
            )}
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
              {topper.registrations?.fullName?.charAt(0) || 'T'}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6">
                #{index + 1} {topper.registrations?.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {topper.registrations?.schools?.name}
              </Typography>
              <Typography variant="body2">
                Class {topper.registrations?.class}-{topper.registrations?.groupType}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="h5">{topper.total}</Typography>
              <Typography variant="body2" color="text.secondary">
                {topper.percentage?.toFixed(2)}%
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Hall of Fame
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Exam Year</InputLabel>
          <Select
            value={examYearFilter}
            label="Exam Year"
            onChange={(e) => setExamYearFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {examYears?.data?.map((year: any) => (
              <MenuItem key={year.id} value={year.id}>
                {year.year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Class</InputLabel>
          <Select
            value={classFilter}
            label="Class"
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {[6, 7, 8, 9, 10, 11, 12].map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Group</InputLabel>
          <Select
            value={groupFilter}
            label="Group"
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="A">A</MenuItem>
            <MenuItem value="B">B</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Global Top 10" />
        <Tab label="School-wise Top 10" />
      </Tabs>

      {tab === 0 && (
        <Box>
          {globalLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : globalToppers?.data?.length > 0 ? (
            <Grid container spacing={2}>
              {globalToppers.data.slice(0, 10).map((topper: any, index: number) =>
                renderTopper(topper, index)
              )}
            </Grid>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={4}>
              No toppers found for the selected filters.
            </Typography>
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <FormControl size="small" sx={{ minWidth: 300, mb: 3 }}>
            <InputLabel>Select School</InputLabel>
            <Select
              value={schoolFilter}
              label="Select School"
              onChange={(e) => setSchoolFilter(e.target.value)}
            >
              <MenuItem value="">Select a school...</MenuItem>
              {schools?.data?.map((school: any) => (
                <MenuItem key={school.id} value={school.id}>
                  {school.name} ({school.districts?.name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!schoolFilter ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              Please select a school to view toppers.
            </Typography>
          ) : schoolLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : schoolToppers?.data?.length > 0 ? (
            <Grid container spacing={2}>
              {schoolToppers.data.slice(0, 10).map((topper: any, index: number) =>
                renderTopper(topper, index)
              )}
            </Grid>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={4}>
              No toppers found for this school.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
