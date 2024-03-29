export function twoDigits(n: number): string {
  const s = `${n}`;
  if (s.length == 1) {
    return "0" + s;
  } else {
    return s;
  }
}

interface MyDate {
  year: number;
  month: string;
  day: number;
  ampm: "am" | "pm";
  hour: number;
  minute: number;
}

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function renderMonth(d: Date): string {
  return months[d.getMonth()];
}

function convertDate(d: Date): MyDate {
  return {
    year: d.getFullYear(),
    //month: d.toLocaleString('default', {month: 'short'}),
    month: renderMonth(d),
    day: d.getDate(),
    hour: ((d.getHours() + 11) % 12) + 1,
    ampm: d.getHours() < 12 ? "am" : "pm",
    minute: d.getMinutes(),
  };
}

export function renderTime(date: Date): string {
  const now = convertDate(new Date());
  const myDate = convertDate(date);
  function renderTime(d: MyDate) {
    return `${d.hour}:${twoDigits(d.minute)}`;
  }
  function renderAMPM(d: MyDate) {
    return `${renderTime(d)} ${d.ampm == "am" ? "AM" : "PM"}`;
  }
  function renderDay(d: MyDate, prefix: string) {
    return `${prefix || renderAMPM(d) + ","} ${d.month} ${d.day}`;
  }
  function renderYear(d: MyDate, prefix: string) {
    return `${renderDay(d, prefix)}, ${d.year}`;
  }
  //const isMidnight = (myDate.ampm == 'am' && myDate.hour == 12 && myDate.minute == 0)
  const prefix = renderAMPM(myDate) + ",";
  if (now.year != myDate.year) return renderYear(myDate, prefix);
  else if (now.month != myDate.month || now.day != myDate.day)
    return renderDay(myDate, prefix);
  else if (now.ampm != myDate.ampm || myDate.hour == 12)
    return renderAMPM(myDate);
  else return renderTime(myDate);
}

export function renderTimeFull(date: Date): string {
  const myDate = convertDate(date);
  function renderTime(d: MyDate) {
    return `${d.hour}:${twoDigits(d.minute)}`;
  }
  function renderAMPM(d: MyDate) {
    return `${renderTime(d)} ${d.ampm == "am" ? "AM" : "PM"}`;
  }
  function renderDay(d: MyDate, prefix: string) {
    return `${prefix || renderAMPM(d) + ","} ${d.month} ${d.day}`;
  }
  function renderYear(d: MyDate, prefix: string) {
    return `${renderDay(d, prefix)}, ${d.year}`;
  }
  return renderYear(myDate, renderAMPM(myDate) + ",");
}

export function renderDuration(ms: number): string {
  if (ms < 0) {
    return `-${renderDuration(-ms)}`;
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const s = Math.floor(ms / 1000);
  if (s < 60) {
    return `${s}s`;
  }
  const minutes = Math.round(s / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h:${twoDigits(m)}m`;
}

export function renderDay(d: Date): string {
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    weekday: "short",
    month: "short",
  });
}

export function renderPercentage(x: number): string {
  return `${Math.round(x * 100)}%`;
}