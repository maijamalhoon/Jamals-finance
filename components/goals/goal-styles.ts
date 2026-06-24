type GoalStyleInput = {
  name: string;
  icon?: string | null;
};

export type GoalCategory =
  | "travel"
  | "electronics"
  | "car"
  | "home"
  | "other";

export type GoalCategoryStyle = {
  category: GoalCategory;
  label: string;
  accent: string;
};

const GOAL_CATEGORY_STYLES: Record<GoalCategory, GoalCategoryStyle> = {
  travel: {
    category: "travel",
    label: "Travel",
    accent: "#3b82f6",
  },
  electronics: {
    category: "electronics",
    label: "Electronics",
    accent: "#8b5cf6",
  },
  car: {
    category: "car",
    label: "Car",
    accent: "#06b6d4",
  },
  home: {
    category: "home",
    label: "House",
    accent: "#16a34a",
  },
  other: {
    category: "other",
    label: "Other",
    accent: "var(--text-secondary)",
  },
};

export function getGoalCategoryStyle(goal: GoalStyleInput) {
  const text = `${goal.name} ${goal.icon ?? ""}`.toLowerCase();

  if (text.includes("plane") || text.includes("travel") || text.includes("trip")) {
    return GOAL_CATEGORY_STYLES.travel;
  }

  if (
    text.includes("smartphone") ||
    text.includes("phone") ||
    text.includes("electronics") ||
    text.includes("laptop") ||
    text.includes("computer")
  ) {
    return GOAL_CATEGORY_STYLES.electronics;
  }

  if (
    text.includes("car") ||
    text.includes("vehicle") ||
    text.includes("auto")
  ) {
    return GOAL_CATEGORY_STYLES.car;
  }

  if (text.includes("home") || text.includes("house")) {
    return GOAL_CATEGORY_STYLES.home;
  }

  return GOAL_CATEGORY_STYLES.other;
}

