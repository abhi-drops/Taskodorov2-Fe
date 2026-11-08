import type { ReactNode } from 'react'

/**
 * A small renderer for the markdown subset release notes use (`docs/feat-release-notes-
 * from-be.md` §3): headings `#`–`###`, bullet and numbered lists, paragraphs, and inline
 * `**bold**`, `*italic*`, `` `code` `` and links. Anything else degrades to plain text.
 *
 * It builds React elements straight from the text and never touches `innerHTML`, so raw
 * HTML in the source shows up as literal text instead of running — notes are treated as
 * untrusted. Links render only for `http(s):` URLs. Kept behind this one component so a
 * full markdown library can replace it without touching callers.
 */

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'p'; text: string }

const HEADING = /^(#{1,3})\s+(.*)$/
const BULLET = /^\s*[-*+]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join(' ') })
    paragraph = []
  }
  const flushList = () => {
    if (list) blocks.push(list)
    list = null
  }

  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() })
      continue
    }
    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    const item = bullet ?? numbered
    if (item) {
      flushParagraph()
      const type = bullet ? 'ul' : 'ol'
      if (list && list.type !== type) flushList()
      list ??= { type, items: [] }
      list.items.push(item[1].trim())
      continue
    }
    // A wrapped line of the previous list item; otherwise ordinary paragraph text.
    if (list && /^\s/.test(line)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`
      continue
    }
    flushList()
    paragraph.push(line.trim())
  }
  flushParagraph()
  flushList()
  return blocks
}

// Alternatives are tried left to right at each position, so `**bold**` wins over `*italic*`.
const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s](?:[^*]*[^*\s])?\*|\[[^\]]+\]\([^)\s]+\))/

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-ink">
          {renderInline(part.slice(2, -2))}
        </strong>
      )
    }
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{renderInline(part.slice(1, -1))}</em>
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part)
    if (link) {
      if (!/^https?:\/\//i.test(link[2])) return link[1]
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="font-medium text-accent-purple underline">
          {link[1]}
        </a>
      )
    }
    return part
  })
}

const HEADING_CLASSES = {
  1: 'mt-3 font-display text-base font-bold text-ink first:mt-0',
  2: 'mt-3 font-display text-base font-bold text-ink first:mt-0',
  3: 'mt-2 font-display text-sm font-bold text-ink first:mt-0',
} as const

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 text-sm text-slate-700 ${className}`}>
      {parseBlocks(source).map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const Tag = block.level === 3 ? 'h5' : block.level === 2 ? 'h4' : 'h3'
            return (
              <Tag key={i} className={HEADING_CLASSES[block.level]}>
                {renderInline(block.text)}
              </Tag>
            )
          }
          case 'ul':
          case 'ol': {
            const Tag = block.type
            return (
              <Tag key={i} className={`flex flex-col gap-1 pl-5 ${block.type === 'ul' ? 'list-disc' : 'list-decimal'}`}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </Tag>
            )
          }
          case 'p':
            return <p key={i}>{renderInline(block.text)}</p>
        }
      })}
    </div>
  )
}
