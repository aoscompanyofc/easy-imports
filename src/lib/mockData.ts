import { subDays, format } from 'date-fns';
import { ChartData, Sale } from '../types';

export const generateRevenueData = (): ChartData[] => {
  return Array.from({ length: 30 }).map((_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'dd/MM'),
    value: Math.floor(Math.random() * (12000 - 3000 + 1) + 3000),
  }));
};

export const MOCK_SALES: Sale[] = [
  {
    id: '1',
    customerName: 'Ricardo Santos',
    productName: 'iPhone 15 Pro Max 256GB',
    value: 8900.00,
    timestamp: subDays(new Date(), 0).toISOString(),
    avatar: 'RS',
  },
  {
    id: '2',
    customerName: 'Ana Paula Oliveira',
    productName: 'MacBook Air M2 13"',
    value: 7500.00,
    timestamp: subDays(new Date(), 0).toISOString(),
    avatar: 'AO',
  },
  {
    id: '3',
    customerName: 'Lucas Ferreira',
    productName: 'AirPods Pro 2',
    value: 1850.00,
    timestamp: subDays(new Date(), 0).toISOString(),
    avatar: 'LF',
  },
  {
    id: '4',
    customerName: 'Mariana Costa',
    productName: 'iPhone 14 128GB',
    value: 4200.00,
    timestamp: subDays(new Date(), 1).toISOString(),
    avatar: 'MC',
  },
  {
    id: '5',
    customerName: 'Bruno Souza',
    productName: 'iPad Air 5 64GB',
    value: 3900.00,
    timestamp: subDays(new Date(), 1).toISOString(),
    avatar: 'BS',
  },
];

export const MOCK_CHANNELS = [
  { name: 'Instagram Orgânico', value: 18, color: '#FFC107' },
  { name: 'Instagram Ads', value: 31, color: '#FFB300' },
  { name: 'Influencer', value: 8, color: '#F57F17' },
  { name: 'OLX', value: 14, color: '#10B981' },
  { name: 'Indicação', value: 9, color: '#3B82F6' },
  { name: 'WhatsApp João', value: 7, color: '#6B7280' },
];

export const MOCK_TOP_PRODUCTS = [
  { id: '1', name: 'iPhone 15 Pro Max 256GB', salesCount: 12 },
  { id: '2', name: 'iPhone 14 128GB', salesCount: 9 },
  { id: '3', name: 'AirPods Pro 2', salesCount: 8 },
  { id: '4', name: 'iPhone 13 128GB', salesCount: 7 },
  { id: '5', name: 'Apple Watch Series 9', salesCount: 5 },
];
