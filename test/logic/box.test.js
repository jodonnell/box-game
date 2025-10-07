import { makeBox, applyCodeIfAvailable, rollRewards } from '@/src/game/box.js'

describe('Box generation', () => {
  it('scales hp with tier and variance', () => {
    const b1 = makeBox(1)
    const b3 = makeBox(3)
    expect(b3.maxHp).toBeGreaterThan(b1.maxHp)
  })

  it('applies code if available', () => {
    const b = makeBox(1)
    const code = b.requiresCode || 'code-t1'
    const { box, used } = applyCodeIfAvailable({ ...b, locked: true, requiresCode: code }, new Set([code]))
    expect(used).toBe(true)
    expect(box.locked).toBe(false)
    expect(box.hp).toBeLessThan(b.hp)
  })

  it('rollRewards returns scrap and drops structure', () => {
    const b = makeBox(1)
    const r = rollRewards(b)
    expect(typeof r.scrap).toBe('number')
    expect(r.drops).toBeDefined()
    expect(Array.isArray(r.drops)).toBe(true)
  })
})

