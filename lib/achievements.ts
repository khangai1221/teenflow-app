// Milestone badges computed purely from existing profile/task/reward
// counters — no DB table needed since nothing here is ever "revoked".

export type AchievementStats = {
  tasksDone: number;
  lifetimePoints: number;
  streak: number;
  rewardsRedeemed: number;
};

export type Achievement = {
  id: string;
  emoji: string;
  label: string;
  description: string;
  isUnlocked: (s: AchievementStats) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-task",
    emoji: "🌱",
    label: "Эхний алхам",
    description: "Анхны даалгавраа гүйцэтгэ",
    isUnlocked: (s) => s.tasksDone >= 1,
  },
  {
    id: "tasks-10",
    emoji: "🔥",
    label: "10 даалгавар",
    description: "10 даалгавар гүйцэтгэ",
    isUnlocked: (s) => s.tasksDone >= 10,
  },
  {
    id: "tasks-50",
    emoji: "🏅",
    label: "50 даалгавар",
    description: "50 даалгавар гүйцэтгэ",
    isUnlocked: (s) => s.tasksDone >= 50,
  },
  {
    id: "tasks-100",
    emoji: "👑",
    label: "100 даалгавар",
    description: "100 даалгавар гүйцэтгэ",
    isUnlocked: (s) => s.tasksDone >= 100,
  },
  {
    id: "streak-7",
    emoji: "⚡",
    label: "7 өдрийн эрч хүч",
    description: "7 өдөр дараалан даалгавар гүйцэтгэ",
    isUnlocked: (s) => s.streak >= 7,
  },
  {
    id: "streak-30",
    emoji: "🌟",
    label: "30 өдрийн эрч хүч",
    description: "30 өдөр дараалан даалгавар гүйцэтгэ",
    isUnlocked: (s) => s.streak >= 30,
  },
  {
    id: "points-100",
    emoji: "⭐",
    label: "100 оноо цуглуулсан",
    description: "Нийт 100 оноо цуглуул",
    isUnlocked: (s) => s.lifetimePoints >= 100,
  },
  {
    id: "points-500",
    emoji: "💎",
    label: "500 оноо цуглуулсан",
    description: "Нийт 500 оноо цуглуул",
    isUnlocked: (s) => s.lifetimePoints >= 500,
  },
  {
    id: "reward-1",
    emoji: "🎁",
    label: "Эхний шагнал",
    description: "Анхны шагналаа ав",
    isUnlocked: (s) => s.rewardsRedeemed >= 1,
  },
  {
    id: "reward-5",
    emoji: "🏆",
    label: "5 шагнал авсан",
    description: "5 шагнал ав",
    isUnlocked: (s) => s.rewardsRedeemed >= 5,
  },
];
