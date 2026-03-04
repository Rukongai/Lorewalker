export const T = {
  // Backgrounds
  bg:      '#1e1e2e',  // main background
  surface: '#181825',  // headers, cards, inputs
  overlay: '#313244',  // elevated surfaces, borders
  muted:   '#45475a',  // active states, pressed

  // Text
  textPrimary:   '#cdd6f4',
  textSecondary: '#a6adc8',
  textMuted:     '#6c7086',
  textSubtle:    '#585b70',

  // Accent
  accent:    '#cba6f7',  // purple — active tabs, buttons, active provider
  accentAlt: '#b4befe',  // pressed accent

  // Entry type badge colors (colored text on bg)
  constant:  '#a6e3a1',  // green
  selective: '#89b4fa',  // blue
  keyword:   '#f9e2af',  // yellow

  // Semantic
  success:   '#a6e3a1',
  warning:   '#f9e2af',
  error:     '#f38ba8',
  info:      '#89b4fa',
  peach:     '#fab387',  // probability-failed
  badgeDark: '#11111b',  // dark text on colored badges
  black:     '#1e1e2e',  // text on type badge backgrounds
} as const
