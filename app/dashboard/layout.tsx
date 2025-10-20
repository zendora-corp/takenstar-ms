'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  ContactMail as ContactIcon,
  EmojiEvents as TrophyIcon,
  PersonAdd as PersonAddIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import Link from 'next/link';

const drawerWidth = 260;

interface NavItem {
  text: string;
  icon: React.ReactElement;
  href: string;
  adminOnly?: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return null;
  }

  const isAdmin = (session.user as any)?.role === 'admin';

  const navItems: NavItem[] = [
    { text: 'Overview', icon: <DashboardIcon />, href: '/dashboard' },
    { text: 'Registrations', icon: <PeopleIcon />, href: '/dashboard/registrations' },
    { text: 'Results', icon: <AssessmentIcon />, href: '/dashboard/results' },
    { text: 'Schools', icon: <SchoolIcon />, href: '/dashboard/schools' },
    { text: 'Districts', icon: <LocationIcon />, href: '/dashboard/districts' },
    { text: 'Exam Years', icon: <CalendarIcon />, href: '/dashboard/exam-years' },
    { text: 'Contacts', icon: <ContactIcon />, href: '/dashboard/contacts' },
    { text: 'Toppers', icon: <TrophyIcon />, href: '/dashboard/toppers' },
    // { text: 'Users', icon: <PersonAddIcon />, href: '/dashboard/users', adminOnly: true },
    // { text: 'Import/Export', icon: <UploadIcon />, href: '/dashboard/import-export', adminOnly: true },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          TTSE 2025
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton component={Link} href={item.href}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            TTSE Management Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {session.user?.name} ({(session.user as any)?.role})
          </Typography>
          <Button color="inherit" onClick={() => signOut({ callbackUrl: '/login' })}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
