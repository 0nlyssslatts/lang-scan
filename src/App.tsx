import { useMemo, useRef, useState } from "react";
import "./App.css";
import { analyzeProgram, ParseError } from "./lang";

const GRAMMAR_TEXT = `Язык = «Begin» Уравнения Множества «End»
Уравнения = Уравнение «;» ... Уравнение
Множества = Множество ... Множество
Уравнение = Метка «:» Перем «=» Прав.часть
Множество = [«Анализ» ! «Синтез»] Перем ... Перем
Прав.часть = </ «-» /> Блок [«+» ! «-»] ... Блок
Блок = Часть [«*» ! «/»] ... Часть
Часть = Кусок [«и» ! «или»] ... Кусок
Кусок = </ «отрицание» /> Элемент
Элемент = </ Функ ... Функ /> Атом
Функ = «sin» ! «cos» ! «tg» ! «abs»
Атом = Цел ! Перем
Метка = Цел
Перем = Буква </ Символ ... Символ />
Символ = Буква ! Цифра
Цел = Цифра ... Цифра
Буква = «A» ! «B» ! ... ! «Z» ! «А» ! «Б» ! ... ! «Я»
Цифра = «0» ! «1» ! ... ! «9»`;

const SAMPLE_INPUT = `Begin
1: X=sin cos abs 3;
Y=(X+2)*4/2-1;
3: Z=отрицание 0 и 1 или 0;
4: W=-tg 0+X;
5: Ж2=456;
6: A1=Ж2+789;
Анализ A B C
Синтез D E
F G H
End`;

function App() {
    const [input, setInput] = useState(SAMPLE_INPUT);
    const [result, setResult] = useState("");
    const [errorLine, setErrorLine] = useState<number | null>(null);
    const [details, setDetails] = useState("");
    const backdropRef = useRef<HTMLPreElement | null>(null);

    const onAnalyze = () => {
        try {
            const out = analyzeProgram(input);
            setResult("");
            setDetails(out.details);
            setErrorLine(null);
        } catch (error) {
            if (error instanceof ParseError) {
                setResult(
                    `Ошибка: ${error.message} (строка ${error.line}, столбец ${error.col})`,
                );
                setDetails("");
                setErrorLine(error.line);

                return;
            }
            setResult(`Неизвестная ошибка: ${(error as Error).message}`);
            setDetails("");
            setErrorLine(null);
        }
    };

    const grammar = useMemo(() => GRAMMAR_TEXT, []);

    const highlightedInput = useMemo(() => {
        const esc = (v: string) =>
            v
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

        const lines = input.split("\n");
        const markerCol = (() => {
            const match = result.match(/столбец\s+(\d+)/i);
            return match ? Number(match[1]) : null;
        })();

        return lines
            .map((line, idx) => {
                if (!(errorLine && idx + 1 === errorLine)) {
                    return line.length === 0 ? " " : esc(line);
                }

                const start = Math.max(0, (markerCol ?? 1) - 1);
                const end = Math.min(line.length, start + 4);

                const left = esc(line.slice(0, start));
                const middle = esc(line.slice(start, end) || " ");
                const right = esc(line.slice(end));

                return `${left}<span class="lineError">${middle}</span>${right}`;
            })
            .join("\n");
    }, [input, errorLine, result]);

    return (
        <main className="page">
            <div className="panels">
                <section>
                    <div className="editorWrap">
                        <pre
                            ref={backdropRef}
                            className="editorBackdrop"
                            aria-hidden="true"
                            dangerouslySetInnerHTML={{
                                __html: highlightedInput,
                            }}
                        />
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onScroll={(e) => {
                                if (!backdropRef.current) return;
                                backdropRef.current.scrollTop =
                                    e.currentTarget.scrollTop;
                                backdropRef.current.scrollLeft =
                                    e.currentTarget.scrollLeft;
                            }}
                            className="editorInput"
                        />
                    </div>
                </section>

                <section>
                    <textarea value={grammar} readOnly />
                </section>
            </div>
            <div>
                <button className="action" type="button" onClick={onAnalyze}>
                    Анализировать
                </button>
            </div>
            <section>
                <pre className={`result ${result ? "errorPreview" : ""}`}>
                    {result || details || "—"}
                </pre>
            </section>
        </main>
    );
}

export default App;
