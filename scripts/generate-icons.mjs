// lib/brandIcon.ts のアイコン定義から PWA / iOS / favicon 用の画像を書き出す
// 使い方: node scripts/generate-icons.mjs
import { createJiti } from 'jiti'
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const jiti = createJiti(import.meta.url)
const { signalAppIconSvg } = await jiti.import('../lib/brandIcon.ts')

const fullBleed = Buffer.from(signalAppIconSvg({ rounded: false })) // OS 側で角丸・マスクされる用
const rounded = Buffer.from(signalAppIconSvg({ rounded: true }))

const png = (svg, size) => sharp(svg, { density: 300 }).resize(size, size).png().toBuffer()

writeFileSync('public/icon-512.png', await png(fullBleed, 512))
writeFileSync('public/icon-192.png', await png(fullBleed, 192))
writeFileSync('public/apple-touch-icon.png', await png(fullBleed, 180))

// favicon.ico（PNG 埋め込み形式・16/32/48px）
const sizes = [16, 32, 48]
const images = await Promise.all(sizes.map((s) => png(rounded, s)))
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4)
let offset = 6 + 16 * sizes.length
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3)
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6)
  e.writeUInt32LE(images[i].length, 8); e.writeUInt32LE(offset, 12)
  offset += images[i].length
  return e
})
writeFileSync('app/favicon.ico', Buffer.concat([header, ...entries, ...images]))

console.log('icons generated')
