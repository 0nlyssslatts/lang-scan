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
    expect(out.details).toContain('1: X = 5')
    expect(out.details).toContain('2: Y = -4')
  })

  it('supports sin/cos/tg/abs and parentheses', () => {
    const src = `Begin
1: S=sin 0;
2: C=cos 0;
3: T=tg 0;
4: A=abs (-3);
Синтез G
End`

    const out = analyzeProgram(src)
    expect(out.details).toContain('1: S = 0')
    expect(out.details).toContain('2: C = 1')
    expect(out.details).toContain('3: T = 0')
    expect(out.details).toContain('4: A = 3')
  })

  it('supports logical operators и/или and отрицание', () => {
    const src = `Begin
1: X=1 и 0;
2: Y=1 или 0;
3: Z=отрицание 0;
Анализ A
End`
    const out = analyzeProgram(src)
    expect(out.details).toContain('1: X = 0')
    expect(out.details).toContain('2: Y = 1')
    expect(out.details).toContain('3: Z = 1')
  })

  it('fails when semicolon between equations is missing', () => {
    const src = `Begin
1: X=2+3
2: Y=1;
Анализ A
End`
    const err = getParseError(src)
    expect(err.message).toContain("После правой части не хватает ';'")
    expect(err.line).toBe(3)
  })

  it('fails when colon after numeric label is missing', () => {
    const src = `Begin
1: A=10;
2 B2=A+1;
Анализ A
End`
    const err = getParseError(src)
    expect(err.message).toContain("После метки '2' не хватает ':'")
  })

  it('fails when operator inside right part is missing', () => {
    const src = `Begin
1: A=10;
2: B2=A 5*2;
Анализ A
End`
    const err = getParseError(src)
    expect(err.message).toContain("Не хватает оператора перед '5'")
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
    expect(err.message).toContain('Не хватает хотя бы одного множества')
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
