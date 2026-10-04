import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * Hands a text file to the user.
 * - Web: a normal browser download.
 * - Android: a WebView can't download a Blob, so the file is written to the app's cache
 *   and passed to the system share sheet (Drive, messaging, "Save to Files"...). The
 *   cache directory needs no storage permission.
 *
 * Resolves once the download has started or the share sheet has closed. Dismissing the
 * share sheet is not an error.
 */
export async function exportTextFile(fileName: string, contents: string, title: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    return
  }

  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  try {
    await Share.share({ title, files: [uri], dialogTitle: title })
  } catch (err) {
    // The plugin rejects when the user backs out of the share sheet.
    if (!/cancel/i.test(String((err as { message?: string })?.message ?? err))) throw err
  }
}

/**
 * Opens the system file picker and resolves with the chosen file's text, or `null` if
 * the user picked nothing. One code path for both platforms: Capacitor's Android
 * WebView opens the system picker for an `<input type="file">`.
 *
 * No `accept` filter beyond JSON's MIME type: Android's picker greys out files by MIME
 * type, and a `.json` file received through a chat app often arrives with a generic one.
 */
export function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (!Capacitor.isNativePlatform()) input.accept = '.json,application/json'
    input.style.display = 'none'

    function finish(value: string | null) {
      input.remove()
      resolve(value)
    }

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return finish(null)
      try {
        finish(await file.text())
      } catch {
        finish(null)
      }
    })
    input.addEventListener('cancel', () => finish(null))

    document.body.appendChild(input)
    input.click()
  })
}
