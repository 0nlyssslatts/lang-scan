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
Анализ X Y
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
Синтез S C T A
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
Анализ X Y Z
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
    expect(err.message).toContain("Уравнение не должно заканчиваться без ';'")
    expect(err.line).toBe(3)
  })

  it('fails when colon after numeric label is missing', () => {
    const src = `Begin
1: A=10;
2 B2=A+1;
Анализ A
End`
    const err = getParseError(src)
    expect(err.message).toContain("После метки '2' не должно идти имя без ':'")
  })

  it('fails when operator inside right part is missing', () => {
    const src = `Begin
1: A=10;
2: B2=A 5*2;
Анализ A
End`
    const err = getParseError(src)
    expect(err.message).toContain("пропуска оператора перед '5'")
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

  it('fails on unknown variable in set', () => {
    const src = `Begin
1: X=1;
Анализ X Y
End`
    const err = getParseError(src)
    expect(err.message).toContain("Неизвестная переменная 'Y' в множестве 'Анализ'")
    expect(err.line).toBe(3)
  })

  it('fails on missing set block', () => {
    const src = `Begin
1: X=1;
End`
    const err = getParseError(src)
    expect(err.message).toContain('нужно хотя бы одно множество')
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
Анализ X
End
X`
    const err = getParseError(src)
    expect(err.message).toContain('Лишний ввод после End')
    expect(err.line).toBe(5)
    expect(err.col).toBe(1)
  })
})
