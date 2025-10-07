import { applyCodeIfAvailable, makeBox, rollRewards } from './box.js'
import { resolvePerk } from './perks.js'

export function createState() {
  const first = makeBox(1)
  return {
    title: 'Arenjie',
    currency: 0, // scrap
    boxesQueue: [first],
    current: first,
    codes: new Set(),
    tools: [], // { name: 'Crowbar', durability: n }
    equippedPerk: 'none',
    passiveDps: 0.5, // hp/sec
    baseCutPower: 4, // per click
    message: 'Open boxes. Find loot. Profit.',
    stats: { opened: 0, destroyed: 0, tierMax: 1 },
    lastEvent: null,
  }
}

export function cyclePerk(state) {
  const order = ['none', 'sharp_blade', 'careful_hands']
  const idx = order.indexOf(state.equippedPerk)
  const next = order[(idx + 1) % order.length]
  state.equippedPerk = next
  state.message = `Equipped: ${resolvePerk(next).name}`
}

export function equipPerk(state, key) {
  state.equippedPerk = key
}

export function effectiveCut(state) {
  const perk = resolvePerk(state.equippedPerk)
  return state.baseCutPower * (perk.mods.cutPowerMul || 1)
}

export function tick(state, dt) {
  // Passive damage
  if (!state.current) return
  applyDamage(state, state.passiveDps * dt)
}

export function applyDamage(state, amount) {
  const box = state.current
  if (!box) return
  const hp = Math.max(0, box.hp - amount)
  box.hp = hp
  if (hp <= 0) openCurrentBox(state)
}

export function clickCut(state) {
  const dmg = effectiveCut(state)
  applyDamage(state, dmg)
}

export function useCrowbar(state) {
  const toolIdx = state.tools.findIndex((t) => t.name === 'Crowbar' && t.durability > 0)
  if (toolIdx === -1) {
    state.message = 'No crowbar available.'
    return
  }
  const perk = resolvePerk(state.equippedPerk)
  const breakChance = 0.2 + (perk.mods.breakChanceAdd || 0)
  const destroyChance = (state.current.fragileChance || 0.1) * (perk.mods.destroyChanceMul || 1)

  // Force attempt: either open instantly or destroy contents
  const destroyed = Math.random() < destroyChance
  state.tools[toolIdx].durability -= 1
  if (Math.random() < breakChance) state.tools[toolIdx].durability = 0

  if (destroyed) {
    // Box breaks, nothing inside
    state.stats.destroyed += 1
    state.message = 'Oops. Box destroyed. Nothing inside.'
    state.lastEvent = { type: 'destroyed', tier: state.current?.tier }
    nextBox(state)
    return
  }
  // Success: open
  openCurrentBox(state)
}

export function gambleHigherTier(state) {
  const cost = 20
  if (state.currency < cost) {
    state.message = `Need ${cost} scrap to gamble.`
    return
  }
  state.currency -= cost
  const bump = Math.random() < 0.6 ? 1 : 2
  const baseTier = state.current ? state.current.tier : 1
  const newBox = makeBox(Math.min(baseTier + bump, 4))
  state.boxesQueue.unshift(newBox) // make it next
  state.message = `Gambled for tier ${newBox.tier} box!`
}

export function spawnIfNeeded(state) {
  if (!state.current) {
    if (state.boxesQueue.length === 0) {
      // Ensure an endless supply of boxes; bias around current progression
      const base = Math.max(1, Math.min(4, state.stats.tierMax))
      const bump = Math.random() < 0.2 ? 1 : 0
      const tier = Math.min(4, base + bump)
      state.boxesQueue.push(makeBox(tier))
    }
    if (state.boxesQueue.length > 0) {
      state.current = state.boxesQueue.shift()
      // Auto-apply code if available
      const { box, used } = applyCodeIfAvailable(state.current, state.codes)
      state.current = box
      if (used) state.codes.delete(`code-t${box.tier}`)
    }
  }
}

export function nextBox(state) {
  state.current = null
  spawnIfNeeded(state)
}

export function openCurrentBox(state) {
  const box = state.current
  if (!box) return
  const rewards = rollRewards(box)
  state.currency += rewards.scrap
  rewards.drops.forEach((d) => {
    if (d.type === 'tool') state.tools.push({ name: d.name, durability: d.durability })
    if (d.type === 'perk') state.equippedPerk = d.key
    if (d.type === 'code') state.codes.add(d.code)
  })
  if (rewards.nested > 0) {
    for (let i = 0; i < rewards.nested; i++) state.boxesQueue.unshift(makeBox(box.tier))
  }
  state.stats.opened += 1
  state.stats.tierMax = Math.max(state.stats.tierMax, box.tier)
  state.message = `Opened T${box.tier}. +${rewards.scrap} scrap${rewards.drops.length ? ' + loot!' : ''}`
  state.lastEvent = { type: 'opened', tier: box.tier }
  state.current = null
  spawnIfNeeded(state)
}

export function lockOrUnlock(state) {
  if (!state.current) return
  const { box, used } = applyCodeIfAvailable(state.current, state.codes)
  state.current = box
  if (used) state.codes.delete(`code-t${box.tier}`)
}
