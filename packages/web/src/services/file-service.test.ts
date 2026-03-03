import { describe, it, expect } from 'vitest'
import { hasUnnamedEntries, applyKeywordNames } from '@/services/file-service'

describe('hasUnnamedEntries', () => {
  it('returns true when any entry has empty name and has keys', () => {
    const entries = [
      { id: '1', name: '', keys: ['dragon'] },
      { id: '2', name: 'Named', keys: ['knight'] },
    ]
    expect(hasUnnamedEntries(entries as any)).toBe(true)
  })

  it('returns false when all entries have names', () => {
    const entries = [
      { id: '1', name: 'Dragon', keys: ['dragon'] },
    ]
    expect(hasUnnamedEntries(entries as any)).toBe(false)
  })

  it('returns false when unnamed entry has no keys', () => {
    const entries = [
      { id: '1', name: '', keys: [] },
    ]
    expect(hasUnnamedEntries(entries as any)).toBe(false)
  })
})

describe('applyKeywordNames', () => {
  it('sets name to first keyword for entries with empty name and keys', () => {
    const entries = [
      { id: '1', name: '', keys: ['dragon', 'wyrm'] },
      { id: '2', name: 'Named', keys: ['knight'] },
    ]
    const result = applyKeywordNames(entries as any)
    expect(result[0].name).toBe('dragon')
    expect(result[1].name).toBe('Named') // unchanged
  })

  it('leaves entries with no keys unchanged even if name is empty', () => {
    const entries = [
      { id: '1', name: '', keys: [] },
    ]
    const result = applyKeywordNames(entries as any)
    expect(result[0].name).toBe('')
  })

  it('returns a new array (does not mutate)', () => {
    const entries = [{ id: '1', name: '', keys: ['x'] }]
    const result = applyKeywordNames(entries as any)
    expect(result).not.toBe(entries)
  })
})
