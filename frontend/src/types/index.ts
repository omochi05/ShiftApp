export type User = {
  id: number;
  name: string;
  email: string;
  role: "owner" | "manager" | "employee";
  hourly_wage: number;
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: number;
  user_id: number;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  created_by: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type OwnerDashboard = {
  year: number;
  month: number;
  total_sales: number;
  total_labor_cost: number;
  labor_cost_rate: number;
};

export type SalaryMonthly = {
  user_id: number;
  year: number;
  month: number;
  total_work_hours: number;
  total_normal_hours: number;
  total_night_hours: number;
  total_salary_target_amount: number;
};

export type OwnerWeeklyDashboard = {
  year: number;
  week: number;
  start_date: string;
  end_date: string;
  total_sales: number;
  total_labor_cost: number;
  profit: number;
  status: "黒字" | "赤字";
  labor_cost_rate: number;
};