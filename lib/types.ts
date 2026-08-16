export type Role = "parent" | "kid";
export type Category = "lesson" | "chore" | "rest" | "family" | "other";
export type Priority = "high" | "med" | "low";
export type TaskStatus = "pending" | "awaiting_approval" | "done";
export type RedemptionStatus = "pending" | "approved" | "rejected" | "cancelled";

export type Family = {
  id: string;
  name: string;
  code: string;
  created_at: string;
};

export type Profile = {
  id: string;
  family_id: string | null;
  role: Role;
  display_name: string;
  age: number | null;
  avatar_url: string | null;
  points: number;
  lifetime_points: number;
  streak_days: number;
  last_completed_date: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  category: Category;
  priority: Priority;
  points: number;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string | null; // HH:MM:SS
  duration_min: number | null;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  photo_path: string | null;
  recurrence_id: string | null;
  recurrence_rule: RecurrenceRule | null;
  requires_approval: boolean;
};

export type RecurrenceRule = "daily" | "weekdays" | "weekly";

export type TaskWithAssignee = Task & {
  assignee: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

export type Reward = {
  id: string;
  family_id: string;
  title: string;
  cost: number;
  created_by: string | null;
  created_at: string;
};

export type RewardRedemption = {
  id: string;
  reward_id: string | null;
  profile_id: string;
  family_id: string;
  title: string;
  cost: number;
  redeemed_at: string;
  status: RedemptionStatus;
};

export type RewardRedemptionWithProfile = RewardRedemption & {
  profile: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};
