import type { CSSProperties } from "react";

type MathSymbolTone = "plus" | "minus" | "multiply" | "divide" | "equals";

type MathSymbol = {
  glyph: "+" | "−" | "×" | "÷" | "=";
  tone: MathSymbolTone;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  driftA: number;
  driftB: number;
  driftC: number;
  rotateStart: number;
  rotateEnd: number;
};

const symbols: MathSymbol[] = [
  { glyph: "+", tone: "plus", x: 7, size: 1.08, duration: 16, delay: -11, opacity: 0.14, driftA: 12, driftB: -5, driftC: 18, rotateStart: -8, rotateEnd: 13 },
  { glyph: "−", tone: "minus", x: 17, size: 0.82, duration: 20, delay: -4, opacity: 0.13, driftA: -9, driftB: 7, driftC: -15, rotateStart: 7, rotateEnd: -11 },
  { glyph: "×", tone: "multiply", x: 28, size: 1.34, duration: 18, delay: -15, opacity: 0.12, driftA: 8, driftB: 19, driftC: 3, rotateStart: -13, rotateEnd: 17 },
  { glyph: "÷", tone: "divide", x: 39, size: 0.94, duration: 22, delay: -8, opacity: 0.13, driftA: -14, driftB: -4, driftC: 11, rotateStart: 9, rotateEnd: -14 },
  { glyph: "=", tone: "equals", x: 51, size: 1.18, duration: 17, delay: -2, opacity: 0.11, driftA: 13, driftB: -8, driftC: 20, rotateStart: -5, rotateEnd: 9 },
  { glyph: "+", tone: "plus", x: 63, size: 0.76, duration: 23, delay: -17, opacity: 0.12, driftA: -7, driftB: 10, driftC: -12, rotateStart: 11, rotateEnd: -8 },
  { glyph: "−", tone: "minus", x: 74, size: 1.28, duration: 19, delay: -6, opacity: 0.12, driftA: 16, driftB: 5, driftC: 24, rotateStart: -10, rotateEnd: 12 },
  { glyph: "×", tone: "multiply", x: 86, size: 0.9, duration: 21, delay: -13, opacity: 0.13, driftA: -12, driftB: -19, driftC: -4, rotateStart: 8, rotateEnd: -16 },
  { glyph: "÷", tone: "divide", x: 95, size: 1.12, duration: 15, delay: -9, opacity: 0.11, driftA: -18, driftB: -7, driftC: -22, rotateStart: -6, rotateEnd: 10 },
  { glyph: "=", tone: "equals", x: 12, size: 0.7, duration: 24, delay: -20, opacity: 0.1, driftA: 7, driftB: 14, driftC: -2, rotateStart: 5, rotateEnd: -9 },
  { glyph: "+", tone: "plus", x: 33, size: 0.98, duration: 21, delay: -1, opacity: 0.11, driftA: -11, driftB: 3, driftC: -17, rotateStart: -9, rotateEnd: 14 },
  { glyph: "×", tone: "multiply", x: 57, size: 0.68, duration: 18, delay: -10, opacity: 0.1, driftA: 10, driftB: -10, driftC: 6, rotateStart: 12, rotateEnd: -7 },
  { glyph: "−", tone: "minus", x: 81, size: 0.78, duration: 25, delay: -22, opacity: 0.1, driftA: 8, driftB: 17, driftC: 1, rotateStart: -4, rotateEnd: 8 },
  { glyph: "÷", tone: "divide", x: 44, size: 1.42, duration: 26, delay: -19, opacity: 0.09, driftA: -5, driftB: 13, driftC: -9, rotateStart: 6, rotateEnd: -12 },
  { glyph: "=", tone: "equals", x: 69, size: 0.88, duration: 20, delay: -16, opacity: 0.1, driftA: 15, driftB: -3, driftC: 19, rotateStart: -7, rotateEnd: 11 },
];

export default function MathSymbolField() {
  return (
    <div className="landing-math-field" aria-hidden="true">
      {symbols.map((symbol, index) => (
        <span
          key={`${symbol.glyph}-${symbol.x}-${index}`}
          className={`landing-math-symbol landing-math-symbol-${symbol.tone}`}
          style={
            {
              "--math-x": `${symbol.x}%`,
              "--math-size": symbol.size,
              "--math-duration": `${symbol.duration}s`,
              "--math-delay": `${symbol.delay}s`,
              "--math-opacity": symbol.opacity,
              "--math-drift-a": `${symbol.driftA}px`,
              "--math-drift-b": `${symbol.driftB}px`,
              "--math-drift-c": `${symbol.driftC}px`,
              "--math-rotate-start": `${symbol.rotateStart}deg`,
              "--math-rotate-end": `${symbol.rotateEnd}deg`,
            } as CSSProperties
          }
        >
          {symbol.glyph}
        </span>
      ))}
    </div>
  );
}
