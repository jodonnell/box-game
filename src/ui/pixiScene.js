import { Application, Graphics, Text, Assets, Container } from 'pixi.js'
import { createState, tick, clickCut, useCrowbar, gambleHigherTier, cyclePerk, spawnIfNeeded, lockOrUnlock } from '@/src/game/state.js'

export async function startGame() {
  const app = new Application()
  await app.init({ background: '#0f0f14', resizeTo: window })
  document.body.appendChild(app.canvas)

  // Ensure font is available
  let base = '.'
  if (import.meta.env.DEV) base = '../..'
  try {
    await Assets.load(`${base}/assets/fonts/OpenSans-Medium.ttf`)
  } catch (e) {
    // Non-fatal if font fails to load
  }

  const state = createState()
  spawnIfNeeded(state)
  lockOrUnlock(state)

  const ui = { hitTimer: 0, particles: [] }

  // UI Elements
  const title = new Text({ text: 'Arenjie', style: { fill: '#FFD166', fontFamily: 'OpenSans Medium', fontSize: 36 } })
  title.x = 20
  title.y = 14
  app.stage.addChild(title)

  const info = new Text({ text: '', style: { fill: '#FFFFFF', fontFamily: 'OpenSans Medium', fontSize: 16 } })
  info.x = 20
  info.y = 60
  app.stage.addChild(info)

  const message = new Text({ text: state.message, style: { fill: '#AAAAAA', fontFamily: 'OpenSans Medium', fontSize: 14 } })
  message.x = 20
  message.y = 84
  app.stage.addChild(message)

  // Box display
  const boxC = new Container()
  app.stage.addChild(boxC)
  const boxG = new Graphics()
  const boxLabel = new Text({ text: '', style: { fill: '#FFFFFF', fontFamily: 'OpenSans Medium', fontSize: 18 } })
  const lockG = new Graphics()
  boxC.addChild(boxG)
  boxC.addChild(boxLabel)
  boxC.addChild(lockG)
  boxC.eventMode = 'static'
  boxC.cursor = 'pointer'
  boxC.on('pointerdown', () => {
    ui.hitTimer = 0.12
    clickCut(state)
  })

  // Progress bar
  const barBg = new Graphics()
  const barFg = new Graphics()
  app.stage.addChild(barBg)
  app.stage.addChild(barFg)

  // FX particles
  const fxG = new Graphics()
  app.stage.addChild(fxG)

  // Buttons
  const makeButton = (label, x, y, onClick) => {
    const g = new Graphics()
    g.roundRect(x, y, 150, 40, 6).fill(0x273142)
    const t = new Text({ text: label, style: { fill: '#FFFFFF', fontFamily: 'OpenSans Medium', fontSize: 16 } })
    t.x = x + 12
    t.y = y + 10
    const container = new Graphics()
    container.addChild(g)
    container.addChild(t)
    container.eventMode = 'static'
    container.on('pointerdown', onClick)
    app.stage.addChild(container)
    return container
  }

  makeButton('Cut [Space]', 20, 120, () => { ui.hitTimer = 0.12; clickCut(state) })
  makeButton('Force Open', 190, 120, () => useCrowbar(state))
  makeButton('Gamble T+', 360, 120, () => gambleHigherTier(state))
  makeButton('Cycle Perk', 530, 120, () => cyclePerk(state))

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault()
      ui.hitTimer = 0.12
      clickCut(state)
    }
  })

  function draw() {
    // Info text
    const box = state.current
    const tools = state.tools.filter((t) => t.durability > 0)
    const perkName = state.equippedPerk
    const currency = state.currency
    const stats = state.stats
    const boxText = box
      ? `Box T${box.tier}${box.locked ? ' [LOCKED]' : ''}  HP: ${Math.ceil(box.hp)}/${box.maxHp}`
      : 'No box. (Click Gamble)'
    info.text = `${boxText}    Scrap: ${currency}    Tools: ${tools.map((t) => `${t.name}(${t.durability})`).join(', ') || '—'}    Perk: ${perkName}    Opened: ${stats.opened}`
    message.text = state.message

    // Box graphics (centered)
    const pad = 20
    const viewW = app.renderer.width
    const viewH = app.renderer.height
    const bw = Math.min(260, viewW - pad * 2)
    const bh = Math.min(180, viewH / 2 - pad * 2)
    const bx = (viewW - bw) / 2
    const by = viewH / 2 - bh / 2 + 100 // push box further down to avoid progress bar

    // Prepare box container transform (origin at visual center)
    // We draw the box centered at local (0,0), so keep pivot at (0,0)
    boxC.pivot.set(0, 0)
    boxC.position.set(bx + bw / 2, by + bh / 2)
    ui.boxCenterX = boxC.position.x
    ui.boxCenterY = boxC.position.y

    boxG.clear()
    if (box) {
      const color = box.locked ? 0x7a2f2f : 0x2f6e7a
      const ox = -bw / 2
      const oy = -bh / 2
      boxG.roundRect(ox, oy, bw, bh, 12).fill(color)
      // inner highlight
      boxG.roundRect(ox + 6, oy + 6, bw - 12, bh - 12, 8).stroke({ color: 0x000000, width: 2, alignment: 0 })
      boxLabel.text = box.locked ? `T${box.tier} LOCKED` : `T${box.tier} BOX`
      boxLabel.x = -boxLabel.width / 2
      boxLabel.y = -boxLabel.height / 2
      boxLabel.visible = true

      // lock icon
      lockG.clear()
      if (box.locked) {
        const lx = ox + bw - 34
        const ly = oy + 10
        // shackle
        lockG.circle(lx + 10, ly + 8, 8).stroke({ color: 0xffd166, width: 2 })
        // body
        lockG.roundRect(lx, ly + 10, 20, 16, 3).fill(0xffd166)
      } else {
        // small unlocked tick/indicator
        lockG.circle(ox + bw - 18, oy + 18, 3).fill(0x06d6a0)
      }
      lockG.visible = true
    } else {
      boxLabel.visible = false
      lockG.visible = false
    }

    // Progress bar
    const width = Math.max(320, app.renderer.width - pad * 2)
    const x = pad
    const y = 180
    barBg.clear()
    barFg.clear()
    barBg.roundRect(x, y, width, 16, 8).fill(0x22262e)
    if (box) {
      const pct = Math.max(0, Math.min(1, 1 - box.hp / box.maxHp))
      barFg.roundRect(x, y, Math.max(0, width * pct), 16, 8).fill(0x06d6a0)
    }

    // Hit animation scale
    if (ui.hitTimer > 0) {
      ui.hitTimer = Math.max(0, ui.hitTimer - 1 / 60)
    }
    const bump = ui.hitTimer > 0 ? (ui.hitTimer / 0.12) : 0
    const scale = 1 + 0.06 * bump
    boxC.scale.set(scale, scale)

    // FX particles render
    fxG.clear()
    ui.particles = ui.particles.filter(p => p.life > 0)
    ui.particles.forEach(p => {
      p.life -= 1 / 60
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.2 // gravity
      fxG.rect(p.x, p.y, 3, 3).fill(p.color)
      fxG.rect(p.x + 1, p.y + 1, 1, 1).fill(0x000000)
    })
  }

  // Ticker
  app.ticker.add((ticker) => {
    const seconds = (ticker.deltaMS || 0) / 1000
    tick(state, seconds)
    draw()
    // Spawn FX on events (after layout so centers are up-to-date)
    if (state.lastEvent) {
      const evt = state.lastEvent
      state.lastEvent = null
      const viewW = app.renderer.width
      const viewH = app.renderer.height
      const cx = ui.boxCenterX ?? viewW / 2
      const cy = ui.boxCenterY ?? viewH / 2
      const color = evt.type === 'destroyed' ? 0xef476f : 0x06d6a0
      for (let i = 0; i < 24; i++) {
        const ang = Math.random() * Math.PI * 2
        const spd = 2 + Math.random() * 3
        ui.particles.push({ x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 2, life: 0.6 + Math.random() * 0.4, color })
      }
    }
  })
}
