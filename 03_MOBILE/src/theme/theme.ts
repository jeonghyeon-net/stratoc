export type AppTheme = 'system' | 'dark' | 'light'

export const defaultTheme: AppTheme = 'dark'

export const appColors = {
  background: '#000000',
  backgroundElevated: '#000000',
  backgroundOverlay: 'rgba(0, 0, 0, 0.78)',
  surface: '#000000',
  surfaceMuted: '#000000',
  surfaceElevated: '#000000',
  surfaceAccent: '#000000',
  border: '#3f3f46',
  borderStrong: '#52525b',
  text: '#f8f8f2',
  textMuted: '#b8b7c9',
  textSubtle: '#8b8aa3',
  primary: '#bd93f9',
  primaryStrong: '#bd93f9',
  primarySoft: '#000000',
  success: '#50fa7b',
  successSoft: '#000000',
  danger: '#ff6b81',
  dangerSoft: '#000000',
  warning: '#f1fa8c',
  warningSoft: '#000000',
  terminal: '#000000',
  terminalSurface: '#000000',
  terminalBorder: '#3f3f46',
} as const

export const appSpacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const

export const appRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const

export const appBreakpoints = {
  tablet: 900,
} as const

export const appShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const

export function clampFontScale(value: number) {
  if (Number.isNaN(value)) {
    return 1
  }
  return Math.max(0.85, Math.min(1.45, Number(value.toFixed(2))))
}
