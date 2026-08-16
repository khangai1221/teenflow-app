import type { Category, Priority } from "@/lib/types";

/** Task categories with Mongolian labels + accent colors (matches the design). */
export const CATEGORIES: Record<
  Category,
  { label: string; color: string; emoji: string }
> = {
  lesson: { label: "Хичээл", color: "#5b8cff", emoji: "📘" },
  chore: { label: "Гэрийн ажил", color: "#ff9f43", emoji: "🧹" },
  rest: { label: "Амралт", color: "#2ecc71", emoji: "☕" },
  family: { label: "Гэр бүлийн цаг", color: "#e084ff", emoji: "🏡" },
  other: { label: "Бусад", color: "#94a3b8", emoji: "✨" },
};

export const CATEGORY_ORDER: Category[] = [
  "lesson",
  "chore",
  "rest",
  "family",
  "other",
];

/** Priorities with Mongolian labels + dot colors (Чухал / Дунд / Бага). */
export const PRIORITIES: Record<Priority, { label: string; color: string }> = {
  high: { label: "Чухал", color: "#ef4444" },
  med: { label: "Дунд", color: "#5b8cff" },
  low: { label: "Бага", color: "#2ecc71" },
};

export const PRIORITY_ORDER: Priority[] = ["high", "med", "low"];
