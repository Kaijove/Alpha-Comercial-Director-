/**
 * Static reference data used by the onboarding and settings forms.
 * Kept in one place so it can later be replaced by a CRM lookup endpoint.
 */

export interface CurrencyOption {
  code: string
  symbol: string
  name: string
}

export interface CountryOption {
  code: string
  name: string
  currency: string
  locale: string
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso' },
]

export const COUNTRIES: CountryOption[] = [
  { code: 'AD', name: 'Andorra', currency: 'EUR', locale: 'ca-AD' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', locale: 'en-AE' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', locale: 'es-AR' },
  { code: 'AT', name: 'Austria', currency: 'EUR', locale: 'de-AT' },
  { code: 'AU', name: 'Australia', currency: 'AUD', locale: 'en-AU' },
  { code: 'BE', name: 'Belgium', currency: 'EUR', locale: 'nl-BE' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', locale: 'pt-BR' },
  { code: 'CA', name: 'Canada', currency: 'CAD', locale: 'en-CA' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', locale: 'de-CH' },
  { code: 'CL', name: 'Chile', currency: 'CLP', locale: 'es-CL' },
  { code: 'CN', name: 'China', currency: 'CNY', locale: 'zh-CN' },
  { code: 'CO', name: 'Colombia', currency: 'COP', locale: 'es-CO' },
  { code: 'CZ', name: 'Czechia', currency: 'CZK', locale: 'cs-CZ' },
  { code: 'DE', name: 'Germany', currency: 'EUR', locale: 'de-DE' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', locale: 'da-DK' },
  { code: 'ES', name: 'Spain', currency: 'EUR', locale: 'es-ES' },
  { code: 'FI', name: 'Finland', currency: 'EUR', locale: 'fi-FI' },
  { code: 'FR', name: 'France', currency: 'EUR', locale: 'fr-FR' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB' },
  { code: 'GR', name: 'Greece', currency: 'EUR', locale: 'el-GR' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', locale: 'en-IE' },
  { code: 'IL', name: 'Israel', currency: 'ILS', locale: 'he-IL' },
  { code: 'IN', name: 'India', currency: 'INR', locale: 'en-IN' },
  { code: 'IT', name: 'Italy', currency: 'EUR', locale: 'it-IT' },
  { code: 'JP', name: 'Japan', currency: 'JPY', locale: 'ja-JP' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', locale: 'ko-KR' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', locale: 'fr-MA' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', locale: 'es-MX' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', locale: 'nl-NL' },
  { code: 'NO', name: 'Norway', currency: 'NOK', locale: 'nb-NO' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', locale: 'en-NZ' },
  { code: 'PE', name: 'Peru', currency: 'PEN', locale: 'es-PE' },
  { code: 'PL', name: 'Poland', currency: 'PLN', locale: 'pl-PL' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', locale: 'pt-PT' },
  { code: 'RO', name: 'Romania', currency: 'RON', locale: 'ro-RO' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', locale: 'ar-SA' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', locale: 'sv-SE' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', locale: 'en-SG' },
  { code: 'TR', name: 'Turkiye', currency: 'TRY', locale: 'tr-TR' },
  { code: 'US', name: 'United States', currency: 'USD', locale: 'en-US' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', locale: 'es-UY' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', locale: 'en-ZA' },
]

export const SECTORS: string[] = [
  'Industrial manufacturing',
  'Software & SaaS',
  'IT services',
  'Professional services',
  'Consulting',
  'Construction',
  'Real estate',
  'Automotive',
  'Logistics & transport',
  'Wholesale & distribution',
  'Retail',
  'Food & beverage',
  'Pharma & life sciences',
  'Healthcare',
  'Energy & utilities',
  'Chemicals',
  'Telecommunications',
  'Financial services',
  'Insurance',
  'Media & advertising',
  'Education',
  'Travel & hospitality',
  'Agriculture',
  'Other',
]

export const JOB_TITLE_SUGGESTIONS: string[] = [
  'Sales Director',
  'Commercial Director',
  'VP of Sales',
  'Head of Sales',
  'Country Manager',
  'Chief Revenue Officer',
]

export const REP_ROLES: string[] = [
  'Account Executive',
  'Senior Account Executive',
  'Key Account Manager',
  'Sales Development Rep',
  'Field Sales Rep',
  'Inside Sales Rep',
  'Sales Engineer',
  'Channel Manager',
]

/** Muted avatar tokens - deliberately low chroma to stay out of the way. */
export const AVATAR_ACCENTS: { bg: string; fg: string }[] = [
  { bg: 'rgba(91,140,255,0.16)', fg: '#8fb0ff' },
  { bg: 'rgba(63,191,143,0.16)', fg: '#63d0a8' },
  { bg: 'rgba(224,164,88,0.16)', fg: '#e2b478' },
  { bg: 'rgba(168,130,255,0.16)', fg: '#b79bff' },
  { bg: 'rgba(94,201,214,0.16)', fg: '#7ed6e0' },
  { bg: 'rgba(229,103,95,0.16)', fg: '#ea8b84' },
  { bg: 'rgba(146,166,190,0.16)', fg: '#a9bbd0' },
  { bg: 'rgba(214,176,120,0.16)', fg: '#dcc094' },
]

export function findCountry(code: string): CountryOption | undefined {
  return COUNTRIES.find((country) => country.code === code)
}

export function findCurrency(code: string): CurrencyOption | undefined {
  return CURRENCIES.find((currency) => currency.code === code)
}

export function avatarAccent(index: number) {
  return AVATAR_ACCENTS[Math.abs(index) % AVATAR_ACCENTS.length]
}
