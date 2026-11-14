const SAO_PAULO_OFFSET = "-03:00";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Intervalo [gte, lt) em ISO UTC para um mês civil em America/Sao_Paulo (UTC−3). */
export function monthRangeSaoPauloUtc(year: number, month: number) {
  if (month < 1 || month > 12) {
    throw new RangeError("month");
  }
  const gte = `${year}-${pad2(month)}-01T03:00:00.000Z`;
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const lt = `${nextMonth.year}-${pad2(nextMonth.month)}-01T03:00:00.000Z`;
  return { gte, lt };
}

export function parseYearMonthParam(
  yearRaw: string | undefined,
  monthRaw: string | undefined,
  fallback: { year: number; month: number },
) {
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const yearOk = Number.isInteger(year) && year >= 2020 && year <= 2100;
  const monthOk = Number.isInteger(month) && month >= 1 && month <= 12;
  return {
    year: yearOk ? year : fallback.year,
    month: monthOk ? month : fallback.month,
  };
}

export function currentYearMonthSaoPaulo() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const [year, month] = today.split("-").map(Number);
  return { year, month };
}

export function monthLabelPt(year: number, month: number) {
  const label = new Date(`${year}-${pad2(month)}-15T12:00:00${SAO_PAULO_OFFSET}`).toLocaleString(
    "pt-BR",
    { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" },
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

function isValidIsoDate(value: string) {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

export function addCalendarDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** [gte, lt) em UTC para dias civis em America/Sao_Paulo (inclusivo em `dateTo`). */
export function dateRangeSaoPauloUtc(dateFrom: string, dateTo: string) {
  if (!isValidIsoDate(dateFrom) || !isValidIsoDate(dateTo)) {
    throw new RangeError("Datas inválidas");
  }
  let from = dateFrom;
  let to = dateTo;
  if (from > to) {
    [from, to] = [to, from];
  }
  return {
    dateFrom: from,
    dateTo: to,
    gte: `${from}T03:00:00.000Z`,
    lt: `${addCalendarDays(to, 1)}T03:00:00.000Z`,
  };
}

export function formatDateBr(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function periodLabelPt(dateFrom: string, dateTo: string) {
  return `${formatDateBr(dateFrom)} a ${formatDateBr(dateTo)}`;
}

export function defaultCorrectorReportDateRange() {
  const { year, month } = currentYearMonthSaoPaulo();
  return {
    dateFrom: `${year}-${pad2(month)}-01`,
    dateTo: new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  };
}

export function parseDateRangeParams(
  fromRaw: string | undefined,
  toRaw: string | undefined,
  fallback: { dateFrom: string; dateTo: string },
) {
  const from = fromRaw?.trim() ?? "";
  const to = toRaw?.trim() ?? "";
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return fallback;
  }

  let dateFrom = from;
  let dateTo = to;
  if (dateFrom > dateTo) {
    [dateFrom, dateTo] = [dateTo, dateFrom];
  }

  const spanDays =
    Math.floor(
      (Date.parse(`${dateTo}T12:00:00.000Z`) - Date.parse(`${dateFrom}T12:00:00.000Z`)) /
        86_400_000,
    ) + 1;
  if (spanDays > MAX_RANGE_DAYS) {
    dateTo = addCalendarDays(dateFrom, MAX_RANGE_DAYS - 1);
  }

  return { dateFrom, dateTo };
}

/** Compatibilidade: ?ano=&mes= vira primeiro e último dia do mês. */
export function dateRangeFromYearMonthParams(
  yearRaw: string | undefined,
  monthRaw: string | undefined,
  fallback: { dateFrom: string; dateTo: string },
) {
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return fallback;
  }
  const lastDay = new Date(year, month, 0).getDate();
  return {
    dateFrom: `${year}-${pad2(month)}-01`,
    dateTo: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}