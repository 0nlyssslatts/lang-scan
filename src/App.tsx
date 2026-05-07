import { useMemo, useRef, useState } from "react";
import "./App.css";
import { analyzeProgram, ParseError } from "./lang";

const GRAMMAR_TEXT = `Язык = «Begin» Уравнения Множества «End»
Уравнения = Уравнение «;» … Уравнение
Множества = Множество … Множество
Уравнение = </ Метка «:» /> Перем «=» Прав.часть
Множество = [«Анализ» ! «Синтез»] Перем … Перем
Прав.часть = </ «-» /> Блок [«+» ! «-»] … Блок
Блок = Часть [«*» ! «/»] … Часть
Часть = Кусок [«и» ! «или»] … Кусок
Кусок = </ «отрицание» /> Элемент
Элемент = </ Функ … Функ /> Атом ! «(» Прав.часть «)»
Функ = «sin» ! «cos» ! «tg» ! «abs»
Атом = Цел ! Перем
Метка = Цел
Перем = Буква </ Буква ! Цифра … Цифра />
Цел = Цифра … Цифра
Буква = «A» ! «B» ! … ! «Z» ! «А» ! «Б» ! … ! «Я»
Цифра = «0» ! «1» ! … ! «9»`;

const SAMPLE_INPUT = `Begin
1: X=sin cos abs 3;
Y=(X+2)*4/2-1;
3: Z=отрицание 0 и 1 или 0;
4: W=-tg 0+X;
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
        return lines
            .map((line, idx) => {
                const safe = line.length === 0 ? " " : esc(line);
                if (errorLine && idx + 1 === errorLine) {
                    return `<span class="lineError">${safe}</span>`;
                }
                return safe;
            })
            .join("\n");
    }, [input, errorLine]);

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
                <pre className="result">{result || details || "—"}</pre>
            </section>
        </main>
    );
}

export default App;
