import type { Shift, User } from "../types";

type Props = {
  shifts: Shift[];
  users: User[];
};

const hours = [
  "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17",
  "18", "19", "20", "21", "22", "23", "0", "1", "2", "3", "4", "5",
];

const weekLabels = ["日", "月", "火", "水", "木", "金", "土"];

function getUserName(users: User[], userId: number) {
  return users.find((user) => user.id === userId)?.name ?? `ID:${userId}`;
}

function getDateLabel(dateText: string) {
  const date = new Date(dateText);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const week = weekLabels[date.getDay()];
  return `${month}/${day}（${week}）`;
}

function timeToPosition(time: string) {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  // 表の開始を6:00にする
  let adjustedHour = hour;
  if (hour < 6) {
    adjustedHour = hour + 24;
  }

  return (adjustedHour - 6) + minute / 60;
}

function getShiftStyle(shift: Shift) {
  const start = timeToPosition(shift.start_time);
  let end = timeToPosition(shift.end_time);

  // 22:00〜06:00 みたいに日付をまたぐ場合
  if (end <= start) {
    end += 24;
  }

  const width = end - start;

  return {
    left: `${start * 64}px`,
    width: `${width * 64}px`,
  };
}

export default function ShiftTimeline({ shifts, users }: Props) {
  const grouped = shifts.reduce<Record<string, Shift[]>>((acc, shift) => {
    if (!acc[shift.work_date]) {
      acc[shift.work_date] = [];
    }
    acc[shift.work_date].push(shift);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();

  return (
    <div style={{ overflowX: "auto", border: "1px solid #333" }}>
      <div style={{ minWidth: `${140 + hours.length * 64}px` }}>
        {/* 時間ヘッダー */}
        <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 2 }}>
          <div
            style={{
              width: "140px",
              background: "#222",
              color: "white",
              padding: "8px",
              borderRight: "1px solid #555",
              boxSizing: "border-box",
              fontWeight: "bold",
            }}
          >
            日付
          </div>

          {hours.map((hour) => (
            <div
              key={hour}
              style={{
                width: "64px",
                background: "#111",
                color: "white",
                textAlign: "center",
                padding: "8px 0",
                borderRight: "1px solid #555",
                boxSizing: "border-box",
                fontWeight: "bold",
              }}
            >
              {hour}
            </div>
          ))}
        </div>

        {/* 日ごとの行 */}
        {dates.map((date) => (
          <div
            key={date}
            style={{
              display: "flex",
              minHeight: "72px",
              borderTop: "1px solid #aaa",
            }}
          >
            <div
              style={{
                width: "140px",
                padding: "8px",
                borderRight: "1px solid #aaa",
                boxSizing: "border-box",
                background: "#f5f5f5",
                fontWeight: "bold",
              }}
            >
              {getDateLabel(date)}
            </div>

            <div
              style={{
                position: "relative",
                width: `${hours.length * 64}px`,
                minHeight: "72px",
                backgroundImage:
                  "linear-gradient(to right, #ddd 1px, transparent 1px)",
                backgroundSize: "64px 100%",
              }}
            >
              {grouped[date].map((shift, index) => (
                <div
                  key={shift.id}
                  style={{
                    position: "absolute",
                    top: `${8 + index * 28}px`,
                    height: "22px",
                    lineHeight: "22px",
                    background: "#cfe8ff",
                    border: "1px solid #2563eb",
                    borderRadius: "4px",
                    padding: "0 6px",
                    boxSizing: "border-box",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    ...getShiftStyle(shift),
                  }}
                  title={`${getUserName(users, shift.user_id)} ${shift.start_time}〜${shift.end_time}`}
                >
                  {getUserName(users, shift.user_id)}　
                  {shift.start_time.slice(0, 5)}〜{shift.end_time.slice(0, 5)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}