// Box generation and handling

export const TIERS = [
  { tier: 1, baseHp: 30, reward: { scrap: [2, 6] }, lockChance: 0.05 },
  { tier: 2, baseHp: 70, reward: { scrap: [6, 14] }, lockChance: 0.08 },
  { tier: 3, baseHp: 140, reward: { scrap: [14, 30] }, lockChance: 0.12 },
  { tier: 4, baseHp: 260, reward: { scrap: [30, 60] }, lockChance: 0.18 },
]

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function randRange([min, max]) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

export function pickTier(targetTier = 1) {
  const idx = clamp(targetTier - 1, 0, TIERS.length - 1)
  return TIERS[idx]
}

export function makeBox(targetTier = 1) {
  const def = pickTier(targetTier)
  const hpVariance = 0.85 + Math.random() * 0.3 // 85%-115%
  const maxHp = Math.round(def.baseHp * hpVariance)
  const locked = Math.random() < def.lockChance
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    tier: def.tier,
    maxHp,
    hp: maxHp,
    locked,
    requiresCode: locked ? `code-t${def.tier}` : null,
    fragileChance: 0.06 + 0.02 * def.tier, // chance contents destroyed on force-open
  }
}

export function rollRewards(box) {
  const def = pickTier(box.tier)
  const scrap = randRange(def.reward.scrap)
  // Simple loot table
  const drops = []
  if (Math.random() < 0.15) drops.push({ type: 'tool', name: 'Crowbar', durability: 5 })
  if (Math.random() < 0.10) drops.push({ type: 'perk', key: 'sharp_blade' })
  if (Math.random() < 0.05) drops.push({ type: 'perk', key: 'careful_hands' })
  if (Math.random() < 0.10) drops.push({ type: 'code', code: `code-t${box.tier + 1}` })
  // Boxes within boxes
  const nested = Math.random() < 0.12 ? 1 + (Math.random() < 0.3 ? 1 : 0) : 0
  return { scrap, drops, nested }
}

export function applyCodeIfAvailable(box, inventoryCodes) {
  if (!box.locked || !box.requiresCode) return { box, used: false }
  if (inventoryCodes.has(box.requiresCode)) {
    const unlocked = { ...box, locked: false, requiresCode: null, hp: Math.max(1, Math.round(box.hp * 0.5)) }
    return { box: unlocked, used: true }
  }
  return { box, used: false }
}

