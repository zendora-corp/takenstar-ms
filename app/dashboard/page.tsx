'use client';

import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, CardActionArea } from '@mui/material';
import { People, School, Assessment, Mail } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

interface Stats {
  totalRegistrations: number;
  totalSchools: number;
  totalResults: number;
  pendingContacts: number;
}

export default function DashboardOverview() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [regsRes, schoolsRes, resultsRes, contactsRes] = await Promise.all([
          fetch('/api/registrations?limit=1'),
          fetch('/api/schools?limit=1'),
          fetch('/api/results?limit=1'),
          fetch('/api/contacts?status=new&limit=1'),
        ]);

        const [regs, schools, results, contacts] = await Promise.all([
          regsRes.json(),
          schoolsRes.json(),
          resultsRes.json(),
          contactsRes.json(),
        ]);

        setStats({
          totalRegistrations: regs.pagination?.total || 0,
          totalSchools: schools.pagination?.total || 0,
          totalResults: results.pagination?.total || 0,
          pendingContacts: contacts.pagination?.total || 0,
        });

        const allRegsRes = await fetch('/api/registrations?limit=1000');
        const allRegs = await allRegsRes.json();

        if (allRegs.success && allRegs.data) {
          const weeklyData: Record<string, number> = {};

          allRegs.data.forEach((reg: any) => {
            const week = dayjs(reg.created_at).startOf('week').format('MMM DD');
            weeklyData[week] = (weeklyData[week] || 0) + 1;
          });

          const chartArray = Object.entries(weeklyData)
            .map(([week, count]) => ({ week, count }))
            .slice(-8);

          setChartData(chartArray);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Total Registrations',
      value: stats?.totalRegistrations || 0,
      icon: <People sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      link: '/dashboard/registrations',
    },
    {
      title: 'Total Schools',
      value: stats?.totalSchools || 0,
      icon: <School sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      link: '/dashboard/schools',
    },
    {
      title: 'Results Entered',
      value: stats?.totalResults || 0,
      icon: <Assessment sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
      // link: '/dashboard/results',
      link: '/dashboard',
    },
    {
      title: 'Pending Contacts',
      value: stats?.pendingContacts || 0,
      icon: <Mail sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
      link: '/dashboard',
      // link: '/dashboard/contacts?status=new',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome to the TTSE 2025 Management System
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
          mt: 2,
        }}
      >
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardActionArea onClick={() => router.push(card.link)}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4">{card.value}</Typography>
                  </Box>
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {chartData.length > 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Registrations per Week
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
