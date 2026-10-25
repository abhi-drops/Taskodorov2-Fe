// Reusable pattern: create real notes on a fresh board via Puppeteer (driving
// localhost:5173, same infra as app-screenshots.sh) and screenshot just the piece of UI
// a slide needs, at deviceScaleFactor 2 for crisp downscaling — instead of hand-building
// a CSS recreation of app UI, which is accurate-by-construction but easy to get wrong
// (sizing/flex bugs) for anything with more than one or two simple pieces.
//
// This specific run was for the "Three kinds of notes." slide: one basic, one counter,
// one checklist note, cropped to just that column. Adapt the `addNote` calls and the
// final clip-region lookup for a different slide's needs; the helpers below
// (clickByAria, xpathEl, sleep) are generic.
//
// Usage: see scripts/app-screenshots.sh for how CHROME/PUPPETEER_CORE/PROFILE_DIR/
// WEB_PORT are discovered and a dev server started; pass OUT_FILE for the destination.
const puppeteer = require(process.env.PUPPETEER_CORE)

const OUT = process.env.OUT_FILE

async function clickByAria(page, label) {
  const handle = await page.evaluateHandle((l) => {
    return document.querySelector(`[aria-label="${l}"]`)
  }, label)
  const el = handle.asElement()
  if (!el) throw new Error(`not found: aria-label="${label}"`)
  await el.click()
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function xpathEl(page, xpath) {
  const handle = await page.evaluateHandle((xp) => {
    return document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
  }, xpath)
  const el = handle.asElement()
  if (!el) throw new Error(`xpath not found: ${xpath}`)
  return el
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME,
    args: ['--no-sandbox', '--hide-scrollbars'],
    userDataDir: process.env.PROFILE_DIR,
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 820, deviceScaleFactor: 2 })
  await page.goto(`http://localhost:${process.env.WEB_PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.waitForFunction(() => document.body.innerText.includes('Click to edit me'), { timeout: 30000 })
  await sleep(500)

  const addNoteUrl = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Add note to In Progress"]')
    if (!el) throw new Error('add-note link not found')
    return el.getAttribute('href')
  })
  console.log('addNoteUrl', addNoteUrl)

  async function addNote(title, afterTitle) {
    await page.goto(`http://localhost:${process.env.WEB_PORT}${addNoteUrl}`, { waitUntil: 'networkidle2', timeout: 30000 })
    const ta = await page.waitForSelector('textarea[placeholder="Note Title"]', { timeout: 10000 })
    await ta.click()
    await ta.type(title)
    await sleep(400)
    if (afterTitle) await afterTitle()
    await sleep(400)
    await page.goto(`http://localhost:${process.env.WEB_PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 })
    await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 10000 }, title)
    await sleep(400)
  }

  async function setColor(index) {
    const ok = await page.evaluate((idx) => {
      const label = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === 'Color' && e.children.length === 0)
      if (!label) return false
      let container = label.parentElement
      let buttons = []
      for (let i = 0; i < 4 && container; i++) {
        buttons = [...container.querySelectorAll('button')]
        if (buttons.length >= 4) break
        container = container.parentElement
      }
      if (!buttons[idx]) return false
      buttons[idx].click()
      return true
    }, index)
    if (!ok) throw new Error('color swatch not found for index ' + index)
  }

  // 1. basic note (yellow)
  await addNote('Finish the course', async () => {
    await setColor(0)
  })

  // 2. counter note (blue)
  await addNote('Water bottles', async () => {
    await setColor(2)
    // open Note Type combobox
    const combo = await xpathEl(page, '//div[span[text()="Note Type"]]//button[@role="combobox"]')
    await combo.click()
    await sleep(200)
    const opt = await xpathEl(page, '//*[@role="option"][.="Counter"]')
    await opt.click()
    await sleep(200)
    const target = await xpathEl(page, '//label[contains(., "Target (optional)")]//input')
    await target.click()
    await target.type('6')
    await page.keyboard.press('Tab') // blur to commit — the value doesn't save otherwise
    await sleep(300)
  })

  // 3. checklist note (green)
  await addNote('Groceries', async () => {
    await setColor(3)
    const combo = await xpathEl(page, '//div[span[text()="Note Type"]]//button[@role="combobox"]')
    await combo.click()
    await sleep(200)
    const opt = await xpathEl(page, '//*[@role="option"][.="Checklist"]')
    await opt.click()
    await sleep(200)
    for (const item of ['Milk', 'Eggs', 'Bread']) {
      const ta = await page.waitForSelector('textarea[placeholder="New item"]', { timeout: 10000 })
      await ta.click()
      await ta.type(item)
      await clickByAria(page, 'Add item')
      await sleep(200)
    }
  })

  await sleep(500)

  // increment the counter to 3/6 — re-query fresh each time since React re-renders
  // the button node after each click, detaching the previous handle.
  async function clickCounterPlus() {
    const result = await page.evaluate(() => {
      const titleEl = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === 'Water bottles' && e.children.length === 0)
      if (!titleEl) return { ok: false, reason: 'title not found' }
      let card = titleEl
      for (let i = 0; i < 8 && card && !card.querySelector('.divide-ink'); i++) card = card.parentElement
      const row = card ? card.querySelector('.divide-ink') : null
      const btn = row ? row.querySelector('button') : null
      if (btn) { btn.click(); return { ok: true } }
      return { ok: false, reason: 'no .divide-ink/button found', cardClass: card && card.className }
    })
    if (!result.ok) throw new Error('counter + button not found: ' + JSON.stringify(result))
  }
  await clickCounterPlus()
  await sleep(200)
  await clickCounterPlus()
  await sleep(200)
  await clickCounterPlus()
  await sleep(300)

  // check "Milk" — list notes have no card-level checkmark (CLAUDE.md), so the first
  // checkbox found climbing up from the title is the first item's own checkbox.
  const milkOk = await page.evaluate(() => {
    const titleEl = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === 'Groceries' && e.children.length === 0)
    let card = titleEl.parentElement
    for (let i = 0; i < 8 && card && card.querySelectorAll('[role="checkbox"]').length === 0; i++) card = card.parentElement
    const cb = card ? card.querySelector('[role="checkbox"]') : null
    if (cb) { cb.click(); return true }
    return false
  })
  if (!milkOk) throw new Error('milk checkbox not found')
  await sleep(500)

  // compute clip region: from the "In Progress" chip to the bottom of the Groceries card
  const clip = await page.evaluate(() => {
    const chip = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === 'In Progress' && e.children.length === 0)
    const groceriesTitle = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === 'Groceries' && e.children.length === 0)
    let groceriesCard = groceriesTitle.parentElement
    for (let i = 0; i < 8 && groceriesCard && groceriesCard.querySelectorAll('[role="checkbox"]').length === 0; i++) groceriesCard = groceriesCard.parentElement
    const finishTitle = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === 'Finish the course' && e.children.length === 0)
    let finishCard = finishTitle
    for (let i = 0; i < 8 && finishCard && !(finishCard.className && typeof finishCard.className === 'string' && finishCard.className.includes('rounded-card')); i++) finishCard = finishCard.parentElement
    const chipR = chip.getBoundingClientRect()
    const topR = finishCard.getBoundingClientRect()
    const botR = groceriesCard.getBoundingClientRect()
    const left = Math.min(chipR.left, topR.left, botR.left)
    const right = Math.max(chipR.right, topR.right, botR.right)
    const top = chipR.top
    const bottom = botR.bottom
    return { left, top, right, bottom }
  })
  console.log('clip', JSON.stringify(clip))

  const pad = 6
  await page.screenshot({
    path: OUT,
    clip: {
      x: Math.max(0, clip.left - pad),
      y: Math.max(0, clip.top - pad),
      width: (clip.right - clip.left) + pad * 2,
      height: (clip.bottom - clip.top) + pad * 2,
    },
  })
  console.log('saved', OUT)

  await browser.close()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
