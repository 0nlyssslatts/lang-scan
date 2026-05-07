export type TokenType = 'kw' | 'id' | 'int' | 'op' | 'paren' | 'eof'

export interface Token {
  type: TokenType
  value: string
  line: number
  col: number
}

export class ParseError extends Error {
  line: number
  col: number
  constructor(message: string, line: number, col: number) {
    super(message)
    this.line = line
    this.col = col
  }
}

const KEYWORDS = new Set(['Begin', 'End', 'Анализ', 'Синтез', 'и', 'или', 'отрицание', 'sin', 'cos', 'tg', 'abs'])
const FUNCS = new Set(['sin', 'cos', 'tg', 'abs'])

const isLetter = (ch: string) => /[A-Za-zА-Яа-яЁё]/.test(ch)
const isDigit = (ch: string) => /[0-9]/.test(ch)

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let line = 1
  let col = 1

  const push = (type: TokenType, value: string, l = line, c = col) => {
    tokens.push({ type, value, line: l, col: c })
  }

  while (i < input.length) {
    const ch = input[i]
    if (ch === '\n') {
      i += 1
      line += 1
      col = 1
      continue
    }
    if (/\s/.test(ch)) {
      i += 1
      col += 1
      continue
    }
    if (';:=+-*/'.includes(ch)) {
      push('op', ch)
      i += 1
      col += 1
      continue
    }
    if (ch === '(' || ch === ')') {
      push('paren', ch)
      i += 1
      col += 1
      continue
    }
    if (isDigit(ch)) {
      const startCol = col
      let value = ch
      i += 1
      col += 1
      while (i < input.length && isDigit(input[i])) {
        value += input[i]
        i += 1
        col += 1
      }
      push('int', value, line, startCol)
      continue
    }
    if (isLetter(ch)) {
      const startCol = col
      let value = ch
      i += 1
      col += 1
      while (i < input.length && (isLetter(input[i]) || isDigit(input[i]))) {
        value += input[i]
        i += 1
        col += 1
      }
      push(KEYWORDS.has(value) ? 'kw' : 'id', value, line, startCol)
      continue
    }
    throw new ParseError(`Недопустимый символ '${ch}'`, line, col)
  }

  tokens.push({ type: 'eof', value: 'EOF', line, col })
  return tokens
}

class Parser {
  private tokens: Token[]
  private pos = 0
  private context = new Map<string, number>()
  private outputs: string[] = []

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  getOutput() {
    return this.outputs
  }

  private current(): Token {
    return this.tokens[this.pos]
  }

  private advance(): Token {
    const t = this.current()
    this.pos += 1
    return t
  }

  private expectValue(value: string): Token {
    const t = this.current()
    if (t.value !== value) {
      if (value === 'End' && t.type === 'eof') {
        throw new ParseError("Ожидалось 'End' в конце программы", t.line, t.col)
      }
      throw new ParseError(`Ожидалось '${value}', получено '${t.value}'`, t.line, t.col)
    }
    this.advance()
    return t
  }

  private expectType(type: TokenType, label: string): Token {
    const t = this.current()
    if (t.type !== type) throw new ParseError(`Ожидалось ${label}, получено '${t.value}'`, t.line, t.col)
    this.advance()
    return t
  }

  parseProgram() {
    this.expectValue('Begin')
    this.parseEquations()
    this.parseSets()
    this.expectValue('End')
    const t = this.current()
    if (t.type !== 'eof') throw new ParseError(`Лишний ввод после End: '${t.value}'`, t.line, t.col)
  }

  private isEquationStart() {
    const t = this.current()
    const next = this.tokens[this.pos + 1]
    return (t.type === 'int' && next?.value === ':') || (t.type === 'id' && next?.value === '=')
  }

  private parseEquations() {
    this.parseEquation()
    this.expectValue(';')
    while (this.isEquationStart()) {
      this.parseEquation()
      this.expectValue(';')
    }
  }

  private isSetStart(t: Token) {
    return t.value === 'Анализ' || t.value === 'Синтез' || t.type === 'id'
  }

  private parseEquation() {
    if (this.current().type === 'int' && this.tokens[this.pos + 1]?.value === ':') {
      this.advance()
      this.expectValue(':')
    }
    const name = this.expectType('id', 'переменная').value
    this.expectValue('=')
    const value = this.parseRightPart()
    this.context.set(name, value)
    this.outputs.push(`${name} = ${Number.isInteger(value) ? value : value.toFixed(6)}`)
  }

  private parseSets() {
    if (!this.isSetStart(this.current())) {
      const t = this.current()
      throw new ParseError('Ожидалось хотя бы одно Множество', t.line, t.col)
    }
    while (this.isSetStart(this.current())) this.parseSet()
  }

  private parseSet() {
    if (this.current().value === 'Анализ' || this.current().value === 'Синтез') this.advance()
    this.expectType('id', 'переменная')
    while (this.current().type === 'id') this.advance()
  }

  private parseRightPart(): number {
    let value = this.parseBlock()
    while (this.current().value === '+' || this.current().value === '-') {
      const op = this.advance().value
      const rhs = this.parseBlock()
      value = op === '+' ? value + rhs : value - rhs
    }
    return value
  }

  private parseBlock(): number {
    let value = this.parsePart()
    while (this.current().value === '*' || this.current().value === '/') {
      const op = this.advance().value
      const rhs = this.parsePart()
      value = op === '*' ? value * rhs : value / rhs
    }
    return value
  }

  private parsePart(): number {
    let value = this.parsePiece()
    while (this.current().value === 'и' || this.current().value === 'или') {
      const op = this.advance().value
      const rhs = this.parsePiece()
      value = op === 'и' ? (value !== 0 && rhs !== 0 ? 1 : 0) : (value !== 0 || rhs !== 0 ? 1 : 0)
    }
    return value
  }

  private parsePiece(): number {
    if (this.current().value === '-') {
      this.advance()
      return -this.parsePiece()
    }
    if (this.current().value === 'отрицание') {
      this.advance()
      return this.parsePiece() === 0 ? 1 : 0
    }
    return this.parseElement()
  }

  private parseElement(): number {
    const funcs: string[] = []
    while (FUNCS.has(this.current().value)) funcs.push(this.advance().value)

    let value: number
    if (this.current().value === '(') {
      this.advance()
      value = this.parseRightPart()
      this.expectValue(')')
    } else if (this.current().type === 'int') {
      value = Number(this.advance().value)
    } else if (this.current().type === 'id') {
      const name = this.advance().value
      if (!this.context.has(name)) {
        const t = this.tokens[this.pos - 1]
        throw new ParseError(`Неизвестная переменная '${name}'`, t.line, t.col)
      }
      value = this.context.get(name)!
    } else {
      const t = this.current()
      throw new ParseError(`Ожидался атом или '(...)', получено '${t.value}'`, t.line, t.col)
    }

    for (let i = funcs.length - 1; i >= 0; i -= 1) {
      const f = funcs[i]
      if (f === 'sin') value = Math.sin(value)
      else if (f === 'cos') value = Math.cos(value)
      else if (f === 'tg') value = Math.tan(value)
      else value = Math.abs(value)
    }

    return value
  }
}

export function analyzeProgram(source: string) {
  const tokens = tokenize(source)
  const parser = new Parser(tokens)
  parser.parseProgram()
  const lines = parser.getOutput()
  return {
    message: 'Синтаксис корректный ✅',
    details: lines.length ? lines.join('\n') : 'Программа обработана.',
  }
}
