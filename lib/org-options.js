export const TIMEZONES = [
  { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacific Time — Los Angeles' },
  { value: 'America/Denver', label: '(GMT-07:00) Mountain Time — Denver' },
  { value: 'America/Chicago', label: '(GMT-06:00) Central Time — Chicago' },
  { value: 'America/New_York', label: '(GMT-05:00) Eastern Time — New York' },
  { value: 'America/Sao_Paulo', label: '(GMT-03:00) São Paulo' },
  { value: 'Europe/London', label: '(GMT+00:00) London' },
  { value: 'Europe/Berlin', label: '(GMT+01:00) Berlin / Paris / Madrid' },
  { value: 'Europe/Istanbul', label: '(GMT+03:00) Istanbul' },
  { value: 'Asia/Dubai', label: '(GMT+04:00) Dubai' },
  { value: 'Asia/Kolkata', label: '(GMT+05:30) India — Kolkata' },
  { value: 'Asia/Singapore', label: '(GMT+08:00) Singapore' },
  { value: 'Asia/Tokyo', label: '(GMT+09:00) Tokyo' },
  { value: 'Australia/Sydney', label: '(GMT+10:00) Sydney' },
];

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
  { value: 'INR', label: 'Indian Rupee (INR)', symbol: '₹' },
  { value: 'JPY', label: 'Japanese Yen (JPY)', symbol: '¥' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)', symbol: 'CA$' },
  { value: 'AUD', label: 'Australian Dollar (AUD)', symbol: 'A$' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)', symbol: 'S$' },
  { value: 'AED', label: 'UAE Dirham (AED)', symbol: 'AED' },
  { value: 'BRL', label: 'Brazilian Real (BRL)', symbol: 'R$' },
];

export const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'it-IT', label: 'Italiano' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'zh-CN', label: '中文 (简体)' },
  { value: 'hi-IN', label: 'हिन्दी' },
  { value: 'ar-AE', label: 'العربية' },
];

export const SUBSCRIPTION_PLANS = [
  { value: 'starter', label: 'Starter', price: '$0', seats: '5 users', description: 'For early teams getting started' },
  { value: 'business', label: 'Business', price: '$49 / seat / mo', seats: 'Unlimited', description: 'For growing teams' },
  { value: 'enterprise', label: 'Enterprise', price: 'Custom', seats: 'Unlimited', description: 'For large orgs with SSO + SCIM' },
];

export function formatCurrency(value, code = 'USD') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value}`;
  }
}
