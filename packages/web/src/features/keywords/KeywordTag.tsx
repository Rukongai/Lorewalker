interface KeywordTagProps {
  keyword: string
  variant: 'primary' | 'secondary'
  onRemove: () => void
}

function isRegex(kw: string) { return kw.startsWith('/') && kw.length > 1 }

function chipClass(kw: string, v: 'primary' | 'secondary'): string {
  if (v === 'secondary' && isRegex(kw))
    return 'bg-ctp-sapphire/35 border border-ctp-sapphire/60 text-ctp-sapphire'
  if (v === 'secondary' || isRegex(kw))
    return 'bg-ctp-teal/35 border border-ctp-teal/60 text-ctp-teal'
  return 'bg-ctp-sky/35 border border-ctp-sky/60 text-ctp-sky'
}

function chipBtnClass(kw: string, v: 'primary' | 'secondary'): string {
  if (v === 'secondary' && isRegex(kw))
    return 'text-ctp-sapphire hover:bg-ctp-sapphire/20 rounded px-0.5 leading-none'
  if (v === 'secondary' || isRegex(kw))
    return 'text-ctp-teal hover:bg-ctp-teal/20 rounded px-0.5 leading-none'
  return 'text-ctp-sky hover:bg-ctp-sky/20 rounded px-0.5 leading-none'
}

export function KeywordTag({ keyword, variant, onRemove }: KeywordTagProps) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 pl-1.5 pr-0.5 py-0.5 rounded text-[10px] select-none ${chipClass(keyword, variant)}`}
    >
      {keyword}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className={chipBtnClass(keyword, variant)}
      >
        ×
      </button>
    </span>
  )
}
