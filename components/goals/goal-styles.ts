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
    accent: "var(--transfer)",
  },
  electronics: {
    category: "electronics",
    label: "Electronics",
    accent: "var(--investment)",
  },
  car: {
    category: "car",
    label: "Car",
    accent: "var(--goals)",
  },
  home: {
    category: "home",
    label: "House",
    accent: "var(--income)",
  },
  other: {
    category: "other",
    label: "Other",
    accent: "var(--text-muted)",
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

