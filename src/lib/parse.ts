//TODO: wish I could accurately typecheck this...

import { twoDigits } from "./format";

//(at least it can be separated and be kind of easy to debug)
export type Rule<T> =
  | { kind: "token"; bind: (x: string) => T; applies: (x: string) => boolean }
  | { kind: "sequence"; parts: Rule<any>[]; map: (xs: any[]) => T }
  | { kind: "either"; options: [Rule<any>, (x: any) => T][] };

export const emptyRule: Rule<null> = {
  kind: "sequence",
  parts: [],
  map: () => null,
};

// return value is [result, parsed, unparsed]
export function parseString<T>(
  rule: Rule<T>,
  s: string
): "fail" | "prefix" | [T, string, string] {
  const tokens: string[] = tokenize(s);
  const result = parse(rule, tokens);
  if (result == "fail" || result == "prefix") return result;
  return [
    result[0],
    tokens.slice(0, result[1]).join(""),
    tokens.slice(result[1]).join(""),
  ];
}

export function splitPrefix<T>(rule: Rule<T>, s: string): [string, string] {
  const m = parseString(rule, s);
  if (m == "fail") return ["", s];
  if (m == "prefix") return [s, ""];
  return [m[1].trim(), m[2].trim()];
}

// start parsing from token start
//fail means no match
//prefix means it may be possible to extend into a match
//The first part of the return value is the result
//The second is the index of the next unparsed token
function parse<T>(
  rule: Rule<T>,
  tokens: string[],
  start: number = 0
): "fail" | "prefix" | [T, number] {
  if (tokens.length == 0) return "prefix";
  switch (rule.kind) {
    case "token":
      for (let i = start; i < tokens.length; i++) {
        if (rule.applies(tokens[i])) {
          return [rule.bind(tokens[i]), i + 1];
        } else if (tokens[i] != " ") {
          return "fail";
        }
      }
      return "prefix";
    case "sequence":
      const vals = [];
      let index = start;
      for (const part of rule.parts) {
        const result = parse(part, tokens, index);
        if (result == "fail" || result == "prefix") return result;
        vals.push(result[0]);
        index = result[1];
      }
      return [rule.map(vals), index];
    case "either":
      let prefix = false;
      for (const [option, f] of rule.options) {
        const result = parse(option, tokens, start);
        if (result == "prefix") {
          prefix = true;
        } else if (result == "fail") {
          continue;
        } else {
          return [f(result[0]), result[1]];
        }
      }
      return prefix ? "prefix" : "fail";
    default:
      return assertNever(rule);
  }
}

const splitters = ` .:,;"'`;

function isNum(c: string) {
  return (
    c == "0" ||
    c == "1" ||
    c == "2" ||
    c == "3" ||
    c == "4" ||
    c == "5" ||
    c == "6" ||
    c == "7" ||
    c == "8" ||
    c == "9"
  );
}

//splits into a sequence of blocks
//splitters become their own single-character blocks
//spaces also divide blocks
//also splits numbers from other stuff
export function tokenize(s: string): string[] {
  let nextPart: string[] = [];
  const parts = [];
  function addPart() {
    if (nextPart.length > 0) {
      parts.push(nextPart.join(""));
      nextPart = [];
    }
  }
  for (const c of s) {
    if (splitters.indexOf(c) >= 0) {
      addPart();
      parts.push(c);
    } else {
      if (nextPart.length > 0 && isNum(c) != isNum(nextPart[0])) {
        addPart();
      }
      nextPart.push(c);
    }
  }
  addPart();
  return parts;
}

export function raw(s: string, ignoreCaps: boolean = true): Rule<string> {
  if (ignoreCaps) s = s.toLowerCase();
  return {
    kind: "token",
    applies: (x) => (ignoreCaps ? x.toLowerCase() == s : x == s),
    bind: () => s,
  };
}

export function anyToken(tokens: string[]): Rule<number> {
  return {
    kind: "token",
    applies: (x) => tokens.indexOf(x.toLowerCase()) >= 0,
    bind: (x) => tokens.indexOf(x.toLowerCase()),
  };
}

export const month: Rule<number> = any<number>([
  anyToken([
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ]),
  anyToken([
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ]),
]);

export const dayName: Rule<lessThan7> = any<number>([
  anyToken([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  anyToken(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]),
]) as Rule<lessThan7>;

export const number: Rule<number> = {
  kind: "token",
  applies: (x) => !isNaN(parseInt(x)),
  bind: (x) => parseInt(x),
};

export function seq<T>(rules: Rule<any>[], f: (xs: any[]) => T): Rule<T> {
  return { kind: "sequence", parts: rules, map: f };
}

export function any<T>(rules: Rule<T>[]): Rule<T> {
  return { kind: "either", options: rules.map((r) => [r, (x) => x]) };
}

const colonTime: Rule<[number, number]> = seq(
  [number, raw(":"), number],
  (xs) => [xs[0], xs[2]]
);

const hToken = any([raw("h"), raw("hours"), raw("hour")]);
const mToken = any([raw("m"), raw("minute"), raw("minutes")]);

function map<S, T>(from: Rule<S>, f: (s: S) => T): Rule<T> {
  return seq([from], (xs) => f(xs[0] as S));
}

export const duration: Rule<number> = any<number>([
  map(colonTime, (xs) => 60 * xs[0] + xs[1]),
  seq(
    [number, hToken, number, mToken],
    (xs) => 60 * (xs[0] as number) + (xs[2] as number)
  ),
  seq([number, hToken], (xs) => 60 * (xs[0] as number)),
  seq([number, mToken], (xs) => xs[0] as number),
  number,
]);

const ampm: Rule<"am" | "pm"> = {
  kind: "either",
  options: [
    [raw("am"), () => "am"],
    [raw("pm"), () => "pm"],
  ],
};

interface DaySpec {
  month: number;
  day: number;
  year?: number;
}

function dateToDaySpec(d: Date) {
  return { month: d.getMonth(), day: d.getDate(), year: d.getFullYear() };
}

function today(): DaySpec {
  return dateToDaySpec(new Date());
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateToDaySpec(d);
}

function startOfDay(d: DaySpec): DateSpec {
  return {
    hours: 12,
    minutes: 0,
    ampm: "am",
    month: d.month,
    day: d.day,
    year: d.year,
  };
}

function endOfDay(d: DaySpec): DateSpec {
  return {
    hours: 12,
    minutes: 0,
    ampm: "am",
    month: d.month,
    day: d.day,
    year: d.year,
    dayOffset: 1,
  };
}

function startOfMonth(m: number): DateSpec {
  return {
    hours: 12,
    minutes: 0,
    ampm: "am",
    month: m,
    day: 1,
    year: new Date().getFullYear(),
  };
}

function endOfMonth(m: number): DateSpec {
  return {
    hours: 12,
    minutes: 0,
    ampm: "am",
    month: (m + 1) % 12,
    day: 1,
    year: new Date().getFullYear() + Math.floor((m + 1) / 12),
  };
}

type lessThan7 = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function lastDayOfWeek(n: lessThan7, weeksAgo: number = 0): DaySpec {
  const d = new Date();
  while (d.getDay() != (n + 1) % 7) d.setDate(d.getDate() - 1);
  d.setDate(d.getDate() - 7 * weeksAgo);
  return { month: d.getMonth(), day: d.getDate(), year: d.getFullYear() };
}

function lastDayOfMonth(n: number, monthsAgo: number = 0): DaySpec {
  const d = new Date();
  while (d.getDate() != n) d.setDate(d.getDate() - 1);
  d.setMonth(d.getMonth() - monthsAgo);
  return { month: d.getMonth(), day: d.getDate(), year: d.getFullYear() };
}

function yearsAgo(y: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  d.setDate(1);
  d.setMonth(0);
  d.setHours(0);
  d.setMinutes(0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return dateToDaySpec(d);
}

export const dayRule: Rule<DaySpec> = any<DaySpec>([
  seq([month, number, raw(","), number], (x) => ({
    month: x[0],
    day: x[1],
    year: x[3],
  })),
  seq([month, number, number], (x) => ({ month: x[0], day: x[1], year: x[2] })),
  seq([month, number], (x) => ({ month: x[0], day: x[1] })),
  seq([number, raw("/"), number, raw("/"), number], (x) => ({
    month: x[0] - 1,
    day: x[2],
    year: x[4],
  })),
  seq([number, raw("/"), number], (x) => ({ month: x[0] - 1, day: x[2] })),
  map(raw("yesterday"), () => yesterday()),
  map(raw("today"), () => today()),
  map(dayName, (x) => lastDayOfWeek(x)),
  seq([raw("last"), dayName], (x) => lastDayOfWeek(x[1], 1)),
]);

export type DateSpec =
  | "now"
  | {
      hours: number;
      minutes: number;
      ampm?: "am" | "pm";
      month?: number;
      day?: number;
      year?: number;
      dayOffset?: number; // Shift this many days forward or backward
    };

const ampmTimeRule: Rule<DateSpec> = any([
  seq([colonTime, ampm], (xs) => ({
    hours: xs[0][0],
    minutes: xs[0][1],
    ampm: xs[1],
  })),
  seq([number, ampm], (xs) => ({ hours: xs[0], minutes: 0, ampm: xs[1] })),
  map(raw("midnight"), () => ({ hours: 12, minutes: 0, ampm: "am" })),
  map(raw("noon"), () => ({ hours: 12, minutes: 0, ampm: "pm" })),
]);

export type DayTimeSpec = {
  hours: number;
  minutes: number;
};

export const timeRule: Rule<DayTimeSpec> = any([
  map(colonTime, (x) => ({
    hours: x[0] as number,
    minutes: x[1] as number,
  })),
  seq([colonTime, ampm], (xs) => ({
    hours: xs[0][0] + xs == "pm" ? 12 : 0,
    minutes: xs[0][1],
  })),
  seq([number, ampm], (xs) => ({
    hours: xs[0] + xs == "pm" ? 12 : 0,
    minutes: 0,
  })),
]);

export const dateToDayTimeSpec = (d: Date): DayTimeSpec => ({
  hours: d.getHours(),
  minutes: d.getMinutes(),
});

export const isBeforeDayTime = (a: DayTimeSpec, b: DayTimeSpec) => {
  if (a.hours < b.hours) return 1;
  if (a.hours > b.hours) return -1;
  if (a.minutes < b.minutes) return 1;
  if (a.minutes > b.minutes) return -1;
  return 0;
};

export const minutesAfterDayTime = (d: DayTimeSpec, minutes: number) => {
  return {
    hours: d.hours + Math.floor(minutes / 60),
    minutes: d.minutes + (minutes % 60),
  };
};

export const dayTimeSpecToMinutes = (d: DayTimeSpec): number =>
  d.hours * 60 + d.minutes;

export const dayTimeSpecToString = (d: DayTimeSpec): string =>
  twoDigits(d.hours) + ":" + twoDigits(d.minutes);

const startOrEnd = any([raw("start"), raw("end"), emptyRule]);

export const dateRule: Rule<DateSpec> = any<DateSpec>([
  seq([ampmTimeRule, raw(","), dayRule], (x) => ({
    hours: x[0].hours,
    minutes: x[0].minutes,
    ampm: x[0].ampm,
    month: x[2].month,
    day: x[2].day,
    year: x[2].year,
  })),
  seq([ampmTimeRule, dayRule], (x) => ({
    hours: x[0].hours,
    minutes: x[0].minutes,
    ampm: x[0].ampm,
    month: x[1].month,
    day: x[1].day,
    year: x[1].year,
  })),
  ampmTimeRule,
  seq([colonTime], (x) => ({
    hours: x[0][0] as number,
    minutes: x[0][1] as number,
  })),
  map(number, (x) => ({ hours: x, minutes: 0 })),
  map(raw("now"), () => "now"),
  seq([startOrEnd, dayRule], (x) => ({
    hours: 12,
    minutes: 0,
    ampm: "am",
    month: x[1].month,
    day: x[1].day,
    year: x[1].year,
    dayOffset: x[0] == "end" ? 1 : 0,
  })),
  seq([startOrEnd, month], (x) => ({
    hours: 12,
    minutes: 0,
    ampm: "am",
    month: x[0] == "start" ? x[1] : (x[1] + 1) % 12,
    day: 1,
  })),
  seq([startOrEnd, number], (x) => ({
    hours: 12,
    minutes: 0,
    ampm: "am",
    month: 1,
    day: 1,
    year: x[0] == "start" ? x[1] : x[1] + 1,
  })),
]);

function assertNever(value: never): never {
  throw new Error("Shouldn't reach this case!");
}

export type Action =
  | { kind: "raw" }
  | { kind: "first"; minutes: number }
  | { kind: "default"; minutes: number }
  | { kind: "now" }
  | { kind: "last"; minutes: number }
  | { kind: "afterFirstMinutes"; minutes: number }
  | { kind: "untilMinutesAgo"; minutes: number }
  | { kind: "until"; time: DateSpec }
  | { kind: "after"; time: DateSpec }
  | { kind: "continueFirst"; minutes: number }
  | { kind: "continue" }
  | { kind: "reverseContinue" };

export const rawAction: Action = { kind: "raw" };

function alias<T extends string>(main: T, synonyms: string[]): Rule<T> {
  const options: string[] = [main as string].concat(synonyms);
  return map(anyToken(options), () => main);
}

const continueRule: Rule<"continue"> = alias("continue", ["c"]);
const reverseContinueRule: Rule<"reverseContinue"> = alias("reverseContinue", [
  "reverse continue",
  "rev continue",
  "rc",
]);

const after: Rule<"after"> = map(anyToken(["after", "since"]), () => "after");

export const actionRule: Rule<Action> = any<Action>([
  map(raw("now"), () => ({ kind: "now" })),
  map(continueRule, () => ({ kind: "continue" })),
  map(reverseContinueRule, () => ({ kind: "reverseContinue" })),
  seq([duration, continueRule], (xs) => ({
    kind: "continueFirst",
    minutes: xs[0],
  })),
  map(duration, (x) => ({ kind: "default", minutes: x })),
  seq([raw("first"), duration, continueRule], (xs) => ({
    kind: "continueFirst",
    minutes: xs[1],
  })),
  seq([any([raw("first"), raw("last")]), duration], (xs) => ({
    kind: xs[0] as "first" | "last",
    minutes: xs[1] as number,
  })),
  seq([raw("until"), duration, raw("ago")], (xs) => ({
    kind: "untilMinutesAgo",
    minutes: xs[1],
  })),
  seq([any([raw("until"), after]), dateRule], (xs) => ({
    kind: xs[0] as "until" | "after",
    time: xs[1] as DateSpec,
  })),
  seq([raw("until"), raw("last"), duration], (xs) => ({
    kind: "untilMinutesAgo",
    minutes: xs[2],
  })),
  seq([after, raw("first"), duration], (xs) => ({
    kind: "afterFirstMinutes",
    minutes: xs[2],
  })),
]);

export type DateRange = {
  start: DateSpec;
  end: DateSpec;
};

export const dateRangeRule = any<DateRange>([
  seq([dateRule, raw("to"), dateRule], ([start, _, end]) => ({ start, end })),
  seq([dateRule, raw("until"), dateRule], ([start, _, end]) => ({
    start,
    end,
  })),
  seq([month], ([month]) => ({
    start: startOfMonth(month),
    end: endOfMonth(month),
  })),
  seq([dateRule], ([day]) => ({
    start: startOfDay(day),
    end: endOfDay(day),
  })),
  map(raw("today"), () => ({
    start: startOfDay(today()),
    end: endOfDay(today()),
  })),
  map(raw("yesterday"), () => ({
    start: startOfDay(yesterday()),
    end: endOfDay(yesterday()),
  })),
  seq([raw("this"), raw("week")], () => ({
    start: startOfDay(lastDayOfWeek(0, 0)),
    end: startOfDay(lastDayOfWeek(0, -1)),
  })),
  seq([raw("last"), raw("week")], () => ({
    start: startOfDay(lastDayOfWeek(0, 1)),
    end: startOfDay(lastDayOfWeek(0, 0)),
  })),
  seq([raw("this"), raw("month")], () => ({
    start: startOfDay(lastDayOfMonth(1, 0)),
    end: startOfDay(lastDayOfMonth(1, -1)),
  })),
  seq([raw("last"), raw("month")], () => ({
    start: startOfDay(lastDayOfMonth(1, 1)),
    end: startOfDay(lastDayOfMonth(1, 0)),
  })),
  seq([raw("this"), raw("year")], () => ({
    start: startOfDay(yearsAgo(0)),
    end: startOfDay(yearsAgo(-1)),
  })),
  seq([raw("last"), raw("year")], () => ({
    start: startOfDay(yearsAgo(1)),
    end: startOfDay(yearsAgo(0)),
  })),
  seq([raw("all"), any([raw("time"), emptyRule])], () => ({
    start: null,
    end: null,
  })),
]);
