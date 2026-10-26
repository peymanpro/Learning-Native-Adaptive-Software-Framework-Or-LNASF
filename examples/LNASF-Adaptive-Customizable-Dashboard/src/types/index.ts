// src/types/index.ts
export type ThemeMode = 'light' | 'dark';

export type ColorPalette = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
};

export type AvailableColor = 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'amber';

export type Theme = {
  primaryColor: AvailableColor;
  fontFamily: string;
  borderRadius: string;
  mode: ThemeMode;
};

export type Stat = {
  id: string;
  label: string;
  value: string | number;
  change: number;
  icon?: string;
};

export type Order = {
  id: number;
  customer: string;
  total: number;
  status: 'completed' | 'pending' | 'cancelled' | 'processing';
  date: string;
};

export type ChartData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }[];
};