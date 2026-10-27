// Real screenshot of the note Status feature: one note, two dated status entries,
// cropped to the title card + status block, at 2x scale. Same pattern as
// notes-screenshot.cjs.
const puppeteer = require(process.env.PUPPETEER_CORE)

const OUT = process.env.OUT_FILE

async function xpathEl(page, xpath) {
  const handle = await page.evaluateHandle((xp) => {
    return document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
  }, xpath)
  const el = handle.asElement()
  if (!el) throw new Error(`xpath not found: ${xpath}`)
  return el
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

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
    const el = document.querySelector('[aria-label^="Add note to"]')
    if (!el) throw new Error('add-note link not found')
    return el.getAttribute('href')
  })

  await page.goto(`http://localhost:${process.env.WEB_PORT}${addNoteUrl}`, { waitUntil: 'networkidle2', timeout: 30000 })
  const ta = await page.waitForSelector('textarea[placeholder="Note Title"]', { timeout: 10000 })
  await ta.click()
  await ta.type('Ship the newsletter')
  await sleep(400)

  async function addStatus(text) {
    const input = await page.waitForSelector('textarea[placeholder="New status"]', { timeout: 10000 })
    await input.click()
    await input.type(text)
    await page.click('[aria-label="Add status"]')
    await sleep(400)
  }
  await addStatus('Drafted the copy')
  await addStatus('Sent to beta testers')
  await sleep(300)

  const clip = await page.evaluate(() => {
    const titleEl = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === 'Ship the newsletter' && e.children.length === 0)
    let titleCard = titleEl
    for (let i = 0; i < 8 && titleCard && !(titleCard.className && typeof titleCard.className === 'string' && titleCard.className.includes('rounded-card')); i++) titleCard = titleCard.parentElement
    const newStatusInput = [...document.querySelectorAll('textarea')].find((e) => e.placeholder === 'New status')
    let statusBlock = newStatusInput
    for (let i = 0; i < 6 && statusBlock && !statusBlock.textContent.includes('Drafted the copy'); i++) statusBlock = statusBlock.parentElement
    const r1 = titleCard.getBoundingClientRect()
    const r2 = statusBlock.getBoundingClientRect()
    return {
      left: Math.min(r1.left, r2.left),
      top: r1.top,
      right: Math.max(r1.right, r2.right),
      bottom: r2.bottom,
    }
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
