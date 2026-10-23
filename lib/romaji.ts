// ひらがな → ローマ字入力の判定（タイピングゲーム用）
// 「し」は si / shi / ci、「ん」は n / nn / xn など、複数の綴りを受け付ける。

const BASE: Record<string, string[]> = {
  あ: ['a'], い: ['i', 'yi'], う: ['u', 'wu', 'whu'], え: ['e'], お: ['o'],
  か: ['ka', 'ca'], き: ['ki'], く: ['ku', 'cu', 'qu'], け: ['ke'], こ: ['ko', 'co'],
  さ: ['sa'], し: ['shi', 'si', 'ci'], す: ['su'], せ: ['se', 'ce'], そ: ['so'],
  た: ['ta'], ち: ['chi', 'ti'], つ: ['tsu', 'tu'], て: ['te'], と: ['to'],
  な: ['na'], に: ['ni'], ぬ: ['nu'], ね: ['ne'], の: ['no'],
  は: ['ha'], ひ: ['hi'], ふ: ['fu', 'hu'], へ: ['he'], ほ: ['ho'],
  ま: ['ma'], み: ['mi'], む: ['mu'], め: ['me'], も: ['mo'],
  や: ['ya'], ゆ: ['yu'], よ: ['yo'],
  ら: ['ra'], り: ['ri'], る: ['ru'], れ: ['re'], ろ: ['ro'],
  わ: ['wa'], を: ['wo'],
  が: ['ga'], ぎ: ['gi'], ぐ: ['gu'], げ: ['ge'], ご: ['go'],
  ざ: ['za'], じ: ['ji', 'zi'], ず: ['zu'], ぜ: ['ze'], ぞ: ['zo'],
  だ: ['da'], ぢ: ['di'], づ: ['du'], で: ['de'], ど: ['do'],
  ば: ['ba'], び: ['bi'], ぶ: ['bu'], べ: ['be'], ぼ: ['bo'],
  ぱ: ['pa'], ぴ: ['pi'], ぷ: ['pu'], ぺ: ['pe'], ぽ: ['po'],
  ぁ: ['xa', 'la'], ぃ: ['xi', 'li'], ぅ: ['xu', 'lu'], ぇ: ['xe', 'le'], ぉ: ['xo', 'lo'],
  ゃ: ['xya', 'lya'], ゅ: ['xyu', 'lyu'], ょ: ['xyo', 'lyo'],
  ー: ['-'],
}

// 拗音など2文字で1音になるもの
const YOUON: Record<string, string[]> = {}
const addRow = (head: string, cons: string[]) => {
  const tails: [string, string][] = [['ゃ', 'a'], ['ゅ', 'u'], ['ょ', 'o']]
  for (const [small, v] of tails) YOUON[head + small] = cons.map((c) => c + v)
}
addRow('き', ['ky']); addRow('ぎ', ['gy']); addRow('に', ['ny']); addRow('ひ', ['hy'])
addRow('び', ['by']); addRow('ぴ', ['py']); addRow('み', ['my']); addRow('り', ['ry'])
addRow('し', ['sh', 'sy']); addRow('ち', ['ch', 'ty', 'cy']); addRow('じ', ['j', 'zy', 'jy'])
Object.assign(YOUON, {
  しぇ: ['she', 'sye'], ちぇ: ['che', 'tye', 'cye'], じぇ: ['je', 'zye', 'jye'],
  ふぁ: ['fa'], ふぃ: ['fi'], ふぇ: ['fe'], ふぉ: ['fo'],
  てぃ: ['thi'], でぃ: ['dhi'], うぃ: ['wi'], うぇ: ['we'],
})

export type RomajiOption = { len: number; romaji: string }

const isVowelLike = (r: string) => 'aiueony'.includes(r[0])

// kana[i] から始まる入力候補（先頭が推奨の綴り）
export function optionsAt(kana: string, i: number): RomajiOption[] {
  const c = kana[i]
  if (c === undefined) return []

  if (c === 'っ') {
    const out: RomajiOption[] = []
    for (const o of optionsAt(kana, i + 1)) {
      if (!isVowelLike(o.romaji)) out.push({ len: 1 + o.len, romaji: o.romaji[0] + o.romaji })
    }
    for (const r of ['xtu', 'ltu', 'xtsu', 'ltsu']) out.push({ len: 1, romaji: r })
    return out
  }

  if (c === 'ん') {
    const next = optionsAt(kana, i + 1)
    // 次が母音・な行・や行・ん で始まる場合や語末は「nn」が必要
    const singleOk = next.length > 0 && !next.some((o) => isVowelLike(o.romaji))
    return [
      ...(singleOk ? [{ len: 1, romaji: 'n' }] : []),
      { len: 1, romaji: 'nn' },
      { len: 1, romaji: 'xn' },
    ]
  }

  const out: RomajiOption[] = []
  const pair = kana.slice(i, i + 2)
  if (YOUON[pair]) out.push(...YOUON[pair].map((romaji) => ({ len: 2, romaji })))
  if (BASE[c]) out.push(...BASE[c].map((romaji) => ({ len: 1, romaji })))
  return out
}

// 1単語ぶんの入力状態
export class RomajiMatcher {
  pos = 0        // 入力済みのかな文字数
  buf = ''       // 現在の音で入力途中のローマ字
  typed = ''     // 確定済みの入力（表示用）

  constructor(readonly kana: string) {}

  get done() {
    return this.pos >= this.kana.length
  }

  private commit(o: RomajiOption) {
    this.typed += o.romaji
    this.pos += o.len
    this.buf = ''
  }

  // ローマ字1文字。正しければ true
  input(ch: string): boolean {
    if (this.done) return false
    const opts = optionsAt(this.kana, this.pos)
    const next = this.buf + ch
    const cands = opts.filter((o) => o.romaji.startsWith(next))
    if (cands.length === 0) {
      // 「n」のように確定可能な入力が保留中なら確定して次の音で判定し直す
      const pending = this.buf ? opts.find((o) => o.romaji === this.buf) : undefined
      if (pending) {
        this.commit(pending)
        return this.input(ch)
      }
      return false
    }
    this.buf = next
    const exact = cands.find((o) => o.romaji === next)
    if (exact && !cands.some((o) => o.romaji.length > next.length)) this.commit(exact)
    return true
  }

  // かな1文字（スマホのフリック入力など）。正しければ true
  inputKana(ch: string): boolean {
    if (this.done || this.buf) return false
    if (this.kana[this.pos] !== ch) return false
    this.typed += ch
    this.pos += 1
    return true
  }

  // 入力ガイド：入力済み部分と、推奨綴りでの残り
  guide(): { typed: string; rest: string } {
    let rest = ''
    let i = this.pos
    if (i < this.kana.length) {
      const cur = optionsAt(this.kana, i).find((o) => o.romaji.startsWith(this.buf))
      if (cur) {
        rest += cur.romaji.slice(this.buf.length)
        i += cur.len
      }
    }
    while (i < this.kana.length) {
      const o = optionsAt(this.kana, i)[0]
      if (!o) break
      rest += o.romaji
      i += o.len
    }
    return { typed: this.typed + this.buf, rest }
  }
}
