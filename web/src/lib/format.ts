import { parsePhoneNumber } from 'libphonenumber-js';

export function formatPhoneNumber(phone: string): string {
  try {
    const parsed = parsePhoneNumber(phone, 'US');
    if (parsed) return parsed.formatNational();
  } catch {
    /* keep original */
  }
  if (phone.length > 6) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  return phone;
}

export function formatListTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (days === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
}

export function formatThreadStamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  if (days < 7) {
    return `${date.toLocaleDateString('en-US', { weekday: 'long' })} ${time}`;
  }
  return `${date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })} at ${time}`;
}

export function avatarInitials(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 2) return digits.slice(-2);
  return (phone.replace(/^\+/, '') || '?').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#5ac8fa',
  '#007aff',
  '#5856d6',
  '#af52de',
  '#ff2d55',
  '#ff3b30',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#00c7be',
];

export function avatarColor(phone: string): string {
  const seed = phone.replace(/\D/g, '') || phone;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
