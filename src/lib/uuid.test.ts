import { describe, it, expect } from 'vitest'
import { generateId } from './uuid'

describe('generateId', () => {
  it('returns a UUID v4 string', () => {
    const id = generateId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('returns unique values', () => {
    const a = generateId()
    const b = generateId()
    expect(a).not.toBe(b)
  })
})
