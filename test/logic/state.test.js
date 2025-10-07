import { createState, clickCut, openCurrentBox } from "@/src/game/state.js"

describe("State logic", () => {
  it("clickCut reduces hp", () => {
    const s = createState()
    const start = s.current.hp
    clickCut(s)
    expect(s.current.hp).toBeLessThan(start)
  })

  it("openCurrentBox grants scrap or loot", () => {
    const s = createState()
    s.current.hp = 0
    openCurrentBox(s)
    expect(s.currency).toBeGreaterThanOrEqual(0)
    expect(s.stats.opened).toBe(1)
  })
})
