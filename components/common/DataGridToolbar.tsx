import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  Stack,
  InputAdornment,
} from '@mui/material';
import { Search, Clear, Download } from '@mui/icons-material';

interface Filter {
  label: string;
  value: string;
}

interface DataGridToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: Filter[];
  onClearFilters?: () => void;
  onExport?: () => void;
  searchPlaceholder?: string;
}

export default function DataGridToolbar({
  searchValue,
  onSearchChange,
  filters = [],
  onClearFilters,
  onExport,
  searchPlaceholder = 'Search...',
}: DataGridToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  return (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />

        {filters.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {filters.map((filter, index) => (
              <Chip key={index} label={`${filter.label}: ${filter.value}`} size="small" />
            ))}
          </Stack>
        )}

        {(filters.length > 0 || localSearch) && onClearFilters && (
          <Button
            startIcon={<Clear />}
            onClick={onClearFilters}
            size="small"
            variant="outlined"
          >
            Clear Filters
          </Button>
        )}

        {onExport && (
          <Button
            startIcon={<Download />}
            onClick={onExport}
            size="small"
            variant="outlined"
            sx={{ ml: 'auto' }}
          >
            Export CSV
          </Button>
        )}
      </Stack>
    </Box>
  );
}
