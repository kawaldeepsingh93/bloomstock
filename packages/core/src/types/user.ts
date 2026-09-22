export type UserRole = 'viewer' | 'trader' | 'admin';

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  capital: number;
  riskPercent: number;
  telegramChatId: string | null;
  whatsappNumber: string | null;
  notifyEmail: boolean;
  notifyTelegram: boolean;
  notifyWhatsapp: boolean;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  symbols: string[];
}

export interface SavedScan {
  id: string;
  userId: string;
  name: string;
  filters: ScanFilters;
}

export interface ScanFilters {
  marketCapMin?: number;
  marketCapMax?: number;
  sectors?: string[];
  rsiMin?: number;
  rsiMax?: number;
  aboveEma20?: boolean;
  aboveEma50?: boolean;
  volumeRatioMin?: number;
  pattern?: 'breakout' | 'cup_handle' | 'flag' | 'ascending_triangle';
  breakoutOnly?: boolean;
}
