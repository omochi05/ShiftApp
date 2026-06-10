/* =========================
   japaneseHolidays.ts
   日本の祝日・休日判定
   固定年リストではなく、日付ルールから自動判定する
========================= */

type HolidayMap = Map<string, string>;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toDateText(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseDateText(dateText: string) {
  const [yearText, monthText, dayText] = dateText.split("-");

  return {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
  };
}

function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

function getNthMonday(year: number, month: number, nth: number) {
  let count = 0;

  for (let day = 1; day <= 31; day += 1) {
    const date = new Date(year, month - 1, day);

    if (date.getMonth() !== month - 1) {
      break;
    }

    if (date.getDay() === 1) {
      count += 1;

      if (count === nth) {
        return day;
      }
    }
  }

  return 1;
}

/*
  春分の日の近似計算。
  1980〜2099年あたりで実用的に使える。
  正式には毎年2月に翌年分が官報で公表される。
*/
function getVernalEquinoxDay(year: number) {
  if (year <= 1979) {
    return Math.floor(20.8357 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4));
  }

  if (year <= 2099) {
    return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }

  return Math.floor(21.851 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/*
  秋分の日の近似計算。
  1980〜2099年あたりで実用的に使える。
*/
function getAutumnalEquinoxDay(year: number) {
  if (year <= 1979) {
    return Math.floor(23.2588 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4));
  }

  if (year <= 2099) {
    return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }

  return Math.floor(24.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function addHoliday(holidays: HolidayMap, year: number, month: number, day: number, name: string) {
  holidays.set(toDateText(year, month, day), name);
}

function buildBaseJapaneseHolidays(year: number) {
  const holidays: HolidayMap = new Map();

  addHoliday(holidays, year, 1, 1, "元日");

  // 成人の日：2000年以降は1月第2月曜日
  if (year >= 2000) {
    addHoliday(holidays, year, 1, getNthMonday(year, 1, 2), "成人の日");
  } else {
    addHoliday(holidays, year, 1, 15, "成人の日");
  }

  addHoliday(holidays, year, 2, 11, "建国記念の日");

  // 天皇誕生日：2020年以降は2月23日
  if (year >= 2020) {
    addHoliday(holidays, year, 2, 23, "天皇誕生日");
  } else if (year >= 1989 && year <= 2018) {
    addHoliday(holidays, year, 12, 23, "天皇誕生日");
  }

  addHoliday(holidays, year, 3, getVernalEquinoxDay(year), "春分の日");

  addHoliday(holidays, year, 4, 29, "昭和の日");

  addHoliday(holidays, year, 5, 3, "憲法記念日");
  addHoliday(holidays, year, 5, 4, "みどりの日");
  addHoliday(holidays, year, 5, 5, "こどもの日");

  // 海の日：2003年以降は7月第3月曜日
  if (year >= 2003) {
    addHoliday(holidays, year, 7, getNthMonday(year, 7, 3), "海の日");
  } else if (year >= 1996) {
    addHoliday(holidays, year, 7, 20, "海の日");
  }

  // 山の日：2016年以降
  if (year >= 2016) {
    addHoliday(holidays, year, 8, 11, "山の日");
  }

  // 敬老の日：2003年以降は9月第3月曜日
  if (year >= 2003) {
    addHoliday(holidays, year, 9, getNthMonday(year, 9, 3), "敬老の日");
  } else if (year >= 1966) {
    addHoliday(holidays, year, 9, 15, "敬老の日");
  }

  addHoliday(holidays, year, 9, getAutumnalEquinoxDay(year), "秋分の日");

  // スポーツの日：2020年以降。2000〜2019年は体育の日。
  if (year >= 2020) {
    addHoliday(holidays, year, 10, getNthMonday(year, 10, 2), "スポーツの日");
  } else if (year >= 2000) {
    addHoliday(holidays, year, 10, getNthMonday(year, 10, 2), "体育の日");
  } else {
    addHoliday(holidays, year, 10, 10, "体育の日");
  }

  addHoliday(holidays, year, 11, 3, "文化の日");
  addHoliday(holidays, year, 11, 23, "勤労感謝の日");

  return holidays;
}

function addSubstituteHolidays(holidays: HolidayMap, year: number) {
  const originalHolidays = Array.from(holidays.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  originalHolidays.forEach(([dateText]) => {
    const { year: y, month, day } = parseDateText(dateText);

    if (y !== year) {
      return;
    }

    const dayOfWeek = getDayOfWeek(y, month, day);

    if (dayOfWeek !== 0) {
      return;
    }

    const substituteDate = new Date(y, month - 1, day + 1);

    while (substituteDate.getFullYear() === year) {
      const substituteText = toDateText(
        substituteDate.getFullYear(),
        substituteDate.getMonth() + 1,
        substituteDate.getDate()
      );

      if (!holidays.has(substituteText)) {
        holidays.set(substituteText, "振替休日");
        break;
      }

      substituteDate.setDate(substituteDate.getDate() + 1);
    }
  });
}

function addCitizenHolidays(holidays: HolidayMap, year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  for (
    let date = new Date(start);
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    const dateText = toDateText(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );

    if (holidays.has(dateText)) {
      continue;
    }

    const previous = new Date(date);
    previous.setDate(date.getDate() - 1);

    const next = new Date(date);
    next.setDate(date.getDate() + 1);

    const previousText = toDateText(
      previous.getFullYear(),
      previous.getMonth() + 1,
      previous.getDate()
    );

    const nextText = toDateText(
      next.getFullYear(),
      next.getMonth() + 1,
      next.getDate()
    );

    if (holidays.has(previousText) && holidays.has(nextText)) {
      holidays.set(dateText, "国民の休日");
    }
  }
}

export function getJapaneseHolidays(year: number) {
  const holidays = buildBaseJapaneseHolidays(year);

  addSubstituteHolidays(holidays, year);
  addCitizenHolidays(holidays, year);

  return holidays;
}

export function getJapaneseHolidayName(dateText: string) {
  const { year } = parseDateText(dateText);
  const holidays = getJapaneseHolidays(year);

  return holidays.get(dateText) ?? "";
}

export function isJapaneseHoliday(dateText: string) {
  return getJapaneseHolidayName(dateText) !== "";
}

export function isSundayOrJapaneseHoliday(dateText: string) {
  const { year, month, day } = parseDateText(dateText);
  const isSunday = getDayOfWeek(year, month, day) === 0;

  return isSunday || isJapaneseHoliday(dateText);
}