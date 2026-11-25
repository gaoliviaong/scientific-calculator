"use client";

import { useCallback, useEffect, useState } from "react";
import { AngleMode, evaluate, formatResult } from "@/lib/evaluate";
import styles from "./calculator.module.css";

interface Key {
  label: string;
  insert?: string;
  action?: "clear" | "back" | "equals" | "ans";
  kind?: "fn" | "num" | "op" | "accent";
}

const KEYS: Key[] = [
  { label: "sin", insert: "sin(", kind: "fn" },
  { label: "cos", insert: "cos(", kind: "fn" },
  { label: "tan", insert: "tan(", kind: "fn" },
  { label: "AC", action: "clear", kind: "accent" },
  { label: "⌫", action: "back", kind: "accent" },

  { label: "sin⁻¹", insert: "asin(", kind: "fn" },
  { label: "cos⁻¹", insert: "acos(", kind: "fn" },
  { label: "tan⁻¹", insert: "atan(", kind: "fn" },
  { label: "(", insert: "(", kind: "op" },
  { label: ")", insert: ")", kind: "op" },

  { label: "log", insert: "log(", kind: "fn" },
  { label: "ln", insert: "ln(", kind: "fn" },
  { label: "√", insert: "sqrt(", kind: "fn" },
  { label: "xʸ", insert: "^", kind: "fn" },
  { label: "÷", insert: "÷", kind: "op" },

  { label: "π", insert: "π", kind: "fn" },
  { label: "7", insert: "7", kind: "num" },
  { label: "8", insert: "8", kind: "num" },
  { label: "9", insert: "9", kind: "num" },
  { label: "×", insert: "×", kind: "op" },

  { label: "e", insert: "e", kind: "fn" },
  { label: "4", insert: "4", kind: "num" },
  { label: "5", insert: "5", kind: "num" },
  { label: "6", insert: "6", kind: "num" },
  { label: "−", insert: "−", kind: "op" },

  { label: "n!", insert: "!", kind: "fn" },
  { label: "1", insert: "1", kind: "num" },
  { label: "2", insert: "2", kind: "num" },
  { label: "3", insert: "3", kind: "num" },
  { label: "+", insert: "+", kind: "op" },

  { label: "%", insert: "%", kind: "fn" },
  { label: "0", insert: "0", kind: "num" },
  { label: ".", insert: ".", kind: "num" },
  { label: "Ans", action: "ans", kind: "fn" },
  { label: "=", action: "equals", kind: "accent" },
];

export default function Calculator() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<AngleMode>("deg");
  const [ans, setAns] = useState(0);
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const [justEvaluated, setJustEvaluated] = useState(false);

  const insert = useCallback(
    (text: string) => {
      setError("");
      // After "=", typing an operator continues from the result; anything else starts fresh
      if (justEvaluated) {
        setExpr(/^[+\-−×÷^!%]/.test(text) ? `${result}${text}` : text);
        setJustEvaluated(false);
        return;
      }
      setExpr((e) => e + text);
    },
    [justEvaluated, result],
  );

  const calculate = useCallback(() => {
    if (!expr) return;
    try {
      const value = evaluate(expr, mode, ans);
      const formatted = formatResult(value);
      setResult(formatted);
      setAns(value);
      setHistory((h) => [{ expr, result: formatted }, ...h].slice(0, 20));
      setJustEvaluated(true);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }, [expr, mode, ans]);

  const press = useCallback(
    (key: Key) => {
      if (key.action === "clear") {
        setExpr("");
        setResult("");
        setError("");
        setJustEvaluated(false);
      } else if (key.action === "back") {
        setError("");
        setJustEvaluated(false);
        // remove a whole function token like "sin(" at once
        setExpr((e) => e.replace(/(?:a?(?:sin|cos|tan)h?|log|ln|sqrt)\($|.$/u, ""));
      } else if (key.action === "equals") {
        calculate();
      } else if (key.action === "ans") {
        insert("ans");
      } else if (key.insert) {
        insert(key.insert);
      }
    },
    [calculate, insert],
  );

  // Keyboard support
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key === "Enter" || ev.key === "=") {
        ev.preventDefault();
        calculate();
      } else if (ev.key === "Backspace") {
        press({ label: "⌫", action: "back" });
      } else if (ev.key === "Escape") {
        press({ label: "AC", action: "clear" });
      } else if (/^[0-9.+\-*/^()!%]$/.test(ev.key)) {
        insert(ev.key === "*" ? "×" : ev.key === "/" ? "÷" : ev.key === "-" ? "−" : ev.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [calculate, insert, press]);

  return (
    <div className={styles.shell}>
      <div className={styles.calc}>
        <div className={styles.display}>
          <div className={styles.topRow}>
            <button
              className={styles.mode}
              onClick={() => setMode((m) => (m === "deg" ? "rad" : "deg"))}
              aria-label={`Angle mode: ${mode === "deg" ? "degrees" : "radians"}. Click to toggle`}
            >
              {mode.toUpperCase()}
            </button>
          </div>
          <div className={styles.expr} aria-label="Expression">
            {expr || "0"}
          </div>
          <div className={error ? styles.error : styles.result} aria-live="polite">
            {error || (result && `= ${result}`) || " "}
          </div>
        </div>

        <div className={styles.keys}>
          {KEYS.map((k) => (
            <button
              key={k.label}
              className={`${styles.key} ${styles[k.kind ?? "num"]}`}
              onClick={() => press(k)}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <aside className={styles.history}>
        <div className={styles.historyHead}>
          <h2>History</h2>
          {history.length > 0 && <button onClick={() => setHistory([])}>Clear</button>}
        </div>
        {history.length === 0 ? (
          <p className={styles.empty}>No calculations yet.</p>
        ) : (
          <ul>
            {history.map((h, i) => (
              <li key={i}>
                <button
                  onClick={() => {
                    setExpr(h.expr);
                    setJustEvaluated(false);
                    setError("");
                  }}
                >
                  <span>{h.expr}</span>
                  <strong>= {h.result}</strong>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
