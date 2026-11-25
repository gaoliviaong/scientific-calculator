export type AngleMode = "deg" | "rad";

type Token =
  | { type: "num"; value: number }
  | { type: "id"; value: string }
  | { type: "op"; value: string };

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error("Factorial needs a non-negative integer");
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function tokenize(input: string): Token[] {
  const src = input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/\s+/g, "");
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw new Error("Invalid number");
      // Avoid swallowing the constant "e" as an exponent (e.g. "2e" -> 2 * e)
      tokens.push({ type: "num", value: parseFloat(m[0]) });
      i += m[0].length;
    } else if (/[a-z]/i.test(ch)) {
      const m = /^[a-z]+/i.exec(src.slice(i))!;
      tokens.push({ type: "id", value: m[0].toLowerCase() });
      i += m[0].length;
    } else if ("+-*/^()!%,".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
    } else {
      throw new Error(`Unexpected "${ch}"`);
    }
  }
  return tokens;
}

export function evaluate(input: string, mode: AngleMode = "deg", ans = 0): number {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new Error("Empty expression");
  let pos = 0;

  const toRad = (x: number) => (mode === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (mode === "deg" ? (x * 180) / Math.PI : x);

  // Snap values like sin(180°) = 1.2e-16 to 0
  const clean = (x: number) => (Math.abs(x) < 1e-14 ? 0 : x);

  const FUNCS: Record<string, (x: number) => number> = {
    sin: (x) => clean(Math.sin(toRad(x))),
    cos: (x) => clean(Math.cos(toRad(x))),
    tan: (x) => {
      const r = toRad(x);
      if (Math.abs(Math.cos(r)) < 1e-14) throw new Error("tan undefined");
      return clean(Math.tan(r));
    },
    asin: (x) => fromRad(Math.asin(x)),
    acos: (x) => fromRad(Math.acos(x)),
    atan: (x) => fromRad(Math.atan(x)),
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    log: Math.log10,
    ln: Math.log,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    exp: Math.exp,
  };

  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.type === "op" && (peek() as { value: string }).value === v;

  function expr(): number {
    let v = term();
    while (isOp("+") || isOp("-")) {
      const op = (tokens[pos++] as { value: string }).value;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  function startsOperand(): boolean {
    const t = peek();
    if (!t) return false;
    return t.type === "num" || t.type === "id" || (t.type === "op" && t.value === "(");
  }

  function term(): number {
    let v = unary();
    for (;;) {
      if (isOp("*")) {
        pos++;
        v *= unary();
      } else if (isOp("/")) {
        pos++;
        const d = unary();
        if (d === 0) throw new Error("Division by zero");
        v /= d;
      } else if (startsOperand()) {
        v *= unary(); // implicit multiplication: 2pi, 3(4+1)
      } else return v;
    }
  }

  function unary(): number {
    if (isOp("-")) {
      pos++;
      return -unary();
    }
    if (isOp("+")) {
      pos++;
      return unary();
    }
    return power();
  }

  function power(): number {
    const base = postfix();
    if (isOp("^")) {
      pos++;
      return Math.pow(base, unary()); // right-associative
    }
    return base;
  }

  function postfix(): number {
    let v = primary();
    while (isOp("!") || isOp("%")) {
      const op = (tokens[pos++] as { value: string }).value;
      v = op === "!" ? factorial(v) : v / 100;
    }
    return v;
  }

  function primary(): number {
    const t = tokens[pos++];
    if (!t) throw new Error("Unexpected end of expression");
    if (t.type === "num") return t.value;
    if (t.type === "id") {
      if (t.value in CONSTANTS) return CONSTANTS[t.value];
      if (t.value === "ans") return ans;
      const fn = FUNCS[t.value];
      if (!fn) throw new Error(`Unknown name "${t.value}"`);
      if (!isOp("(")) throw new Error(`${t.value} needs parentheses`);
      pos++;
      const arg = expr();
      if (isOp(")")) pos++;
      return fn(arg);
    }
    if (t.value === "(") {
      const v = expr();
      if (isOp(")")) pos++; // auto-close missing ")"
      return v;
    }
    throw new Error(`Unexpected "${t.value}"`);
  }

  const result = expr();
  if (pos < tokens.length) {
    const t = tokens[pos];
    throw new Error(`Unexpected "${t.type === "num" ? t.value : t.value}"`);
  }
  if (Number.isNaN(result)) throw new Error("Math error");
  return result;
}

export function formatResult(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? "∞" : "-∞";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return n.toExponential(8).replace(/\.?0+e/, "e");
  return String(parseFloat(n.toPrecision(12)));
}
