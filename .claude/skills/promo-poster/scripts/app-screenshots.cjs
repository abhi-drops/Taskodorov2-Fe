// Takes the screenshots for app-screenshots.sh. Waits for real board content instead of
// a fixed delay: the board appears only after the SQLite WASM database has loaded and
// seeded, which a time budget alone does not wait for.
const puppeteer = require(process.env.PUPPETEER_CORE)

const route = process.env.ROUTE || '/'
const waitText = process.env.WAIT_TEXT || 'Click to edit me'
const out = process.env.OUT_DIR
const jobs = [
  { url: `http://localhost:${process.env.WEB_PORT}${route}`, width: 1440, height: 860, scale: 1.5, file: 'app-desktop.png' },
  { url: `http://localhost:${process.env.MOBILE_PORT}${route}`, width: 412, height: 880, scale: 3, file: 'app-mobile.png' },
]

;(async () => {
  for (const job of jobs) {
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME,
      args: ['--no-sandbox', '--hide-scrollbars'],
      userDataDir: `${process.env.PROFILE_DIR}/${job.file}`,
    })
    const page = await browser.newPage()
    await page.setViewport({ width: job.width, height: job.height, deviceScaleFactor: job.scale })
    await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 60000 })
    try {
      await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 30000 }, waitText)
    } catch {
      console.error(`warning: "${waitText}" never appeared on ${job.url}; the screenshot may show a loading or empty state`)
    }
    await new Promise((r) => setTimeout(r, 1200))
    await page.screenshot({ path: `${out}/${job.file}` })
    await browser.close()
    console.log(`saved ${out}/${job.file}`)
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
