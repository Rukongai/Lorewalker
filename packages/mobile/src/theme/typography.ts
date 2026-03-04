export const FontFamily = {
  sans:         'Sora_400Regular',
  sansSemiBold: 'Sora_600SemiBold',
  sansBold:     'Sora_700Bold',
  mono:         'JetBrainsMono_400Regular',
  monoMedium:   'JetBrainsMono_500Medium',
} as const

export const TypeScale = {
  display:    { fontSize: 32, lineHeight: 40, fontFamily: FontFamily.sansBold },
  heading:    { fontSize: 18, lineHeight: 24, fontFamily: FontFamily.sansSemiBold },
  subheading: { fontSize: 15, lineHeight: 20, fontFamily: FontFamily.sansSemiBold },
  label:      { fontSize: 11, lineHeight: 14, fontFamily: FontFamily.sansSemiBold, letterSpacing: 0.8 },
  body:       { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.sans },
  caption:    { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.sans },
  data:       { fontSize: 14, lineHeight: 18, fontFamily: FontFamily.mono },
  dataLarge:  { fontSize: 36, lineHeight: 44, fontFamily: FontFamily.sansBold },
  dataSm:     { fontSize: 11, lineHeight: 14, fontFamily: FontFamily.mono },
} as const
