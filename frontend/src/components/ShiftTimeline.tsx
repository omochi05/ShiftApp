import type { Shift, User } from "../types";
import "./ShiftTimeline.css";

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

  let adjustedHour = hour;

  if (hour < 6) {
    adjustedHour = hour + 24;
  }

  return adjustedHour - 6 + minute / 60;
}

function getShiftStyle(shift: Shift) {
  const start = timeToPosition(shift.start_time);
  let end = timeToPosition(shift.end_time);

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

  if (shifts.length === 0) {
    return <p className="shift-empty">シフトはありません</p>;
  }

  return (
    <>
      {/* スマホ用カード表示 */}
      <div className="shift-mobile-list">
        {dates.map((date) => (
          <div key={date} className="shift-date-card">
            <h3>{getDateLabel(date)}</h3>

            <div className="shift-card-list">
              {grouped[date].map((shift) => (
                <div key={shift.id} className="shift-card">
                  <div className="shift-card-name">
                    {getUserName(users, shift.user_id)}
                  </div>

                  <div className="shift-card-time">
                    {shift.start_time.slice(0, 5)} 〜 {shift.end_time.slice(0, 5)}
                  </div>

                  <div className="shift-card-break">
                    休憩：{shift.break_minutes}分
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* PC用タイムライン表示 */}
      <div className="shift-timeline">
        <div className="shift-timeline-inner">
          <div className="shift-header-row">
            <div className="shift-date-header">日付</div>

            {hours.map((hour) => (
              <div key={hour} className="shift-hour-cell">
                {hour}
              </div>
            ))}
          </div>

          {dates.map((date) => (
            <div key={date} className="shift-row">
              <div className="shift-date-cell">{getDateLabel(date)}</div>

              <div className="shift-time-area">
                {grouped[date].map((shift, index) => (
                  <div
                    key={shift.id}
                    className="shift-bar"
                    style={{
                      top: `${8 + index * 30}px`,
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
    </>
  );
}