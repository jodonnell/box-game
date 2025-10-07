// Perks with tradeoffs

export const PERKS = {
  none: {
    key: 'none',
    name: 'No Perk',
    desc: 'Plain hands. No modifiers.',
    mods: { cutPowerMul: 1, breakChanceAdd: 0, destroyChanceMul: 1 },
  },
  sharp_blade: {
    key: 'sharp_blade',
    name: 'Sharp Blade',
    desc: '+50% cut, +10% tool break chance',
    mods: { cutPowerMul: 1.5, breakChanceAdd: 0.1, destroyChanceMul: 1 },
  },
  careful_hands: {
    key: 'careful_hands',
    name: 'Careful Hands',
    desc: '-25% destroy chance, -20% cut',
    mods: { cutPowerMul: 0.8, breakChanceAdd: 0, destroyChanceMul: 0.75 },
  },
}

export function resolvePerk(perkKey) {
  return PERKS[perkKey] || PERKS.none
}

