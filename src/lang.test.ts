import { describe, expect, it } from 'vitest'
import { analyzeProgram, ParseError } from './lang'

function getParseError(source: string): ParseError {
  try {
    analyzeProgram(source)
    throw new Error('expected parse error')
  } catch (e) {
    expect(e).toBeInstanceOf(ParseError)
    return e as ParseError
  }
}

describe('lang parser grammar matrix', () => {
  it('accepts valid baseline program and computes output', () => {
    const src = `Begin
1: X=2+3;
2: Y=-abs 4;
Анализ A B
End`

    const out = analyzeProgram(src)
    expect(out.message).toContain('Синтаксис корректный')
    expect(out.details).toContain('X = 5')
    expect(out.details).toContain('Y = -4')
  })

  it('supports sin/cos/tg/abs', () => {
    const src = `Begin
1: S=sin 0;
2: C=cos 0;
3: T=tg 0;
4: A=-abs 3;
Синтез G
End`

    const out = analyzeProgram(src)
    expect(out.details).toContain('S = 0')
    expect(out.details).toContain('C = 1')
    expect(out.details).toContain('T = 0')
    expect(out.details).toContain('A = -3')
  })

  it('supports parentheses, unary minus and отрицание', () => {
    const src = `Begin
1: X=-(2+3)*2;
2: Y=отрицание 0;
3: Z=отрицание 5;
Анализ A
End`

    const out = analyzeProgram(src)
    expect(out.details).toContain('X = -10')
    expect(out.details).toContain('Y = 1')
    expect(out.details).toContain('Z = 0')
  })

  it('supports logical operators и/или', () => {
    const src = `Begin
1: X=1 и 0;
2: Y=1 или 0;
Анализ A
End`
    const out = analyzeProgram(src)
    expect(out.details).toContain('X = 0')
    expect(out.details).toContain('Y = 1')
  })

  it('supports optional label n: and multiple sets', () => {
    const src = `Begin
1: X=1;
2: Y=X+2;
Анализ A B C
Синтез D E
F G
End`

    const out = analyzeProgram(src)
    expect(out.details).toContain('X = 1')
    expect(out.details).toContain('Y = 3')
  })

  it('fails when semicolon is missing', () => {
    const src = `Begin
1: X=2+3
Анализ A
End`
    const err = getParseError(src)
    expect(err.message).toContain("Ожидалось ';'")
    expect(err.line).toBe(3)
    expect(err.col).toBe(1)
  })

  it('fails on unknown variable', () => {
    const src = `Begin
1: X=Y+1;
Анализ A
End`
    const err = getParseError(src)
    expect(err.message).toContain('Неизвестная переменная')
    expect(err.line).toBe(2)
  })

  it('fails on missing set block', () => {
    const src = `Begin
1: X=1;
End`
    const err = getParseError(src)
    expect(err.message).toContain('Ожидалось хотя бы одно Множество')
    expect(err.line).toBe(3)
    expect(err.col).toBe(1)
  })

  it('fails on invalid symbol and reports exact position', () => {
    const src = `Begin
1: X=2@3;
Анализ A
End`
    const err = getParseError(src)
    expect(err.message).toContain("Недопустимый символ '@'")
    expect(err.line).toBe(2)
    expect(err.col).toBe(7)
  })

  it('fails when extra input exists after End', () => {
    const src = `Begin
1: X=1;
Анализ A
End
X`
    const err = getParseError(src)
    expect(err.message).toContain('Лишний ввод после End')
    expect(err.line).toBe(5)
    expect(err.col).toBe(1)
  })
})
