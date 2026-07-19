import { describe, expect, it } from "vitest";

import {
  getDistinctGoalPresentationAssignments,
  inferGoalIconValue,
} from "./goal-icons";

describe("goal icon intelligence", () => {
  it.each([
    ["Banglow", "home"],
    ["Bugatti", "car"],
    ["Jet", "plane"],
    ["Laptop", "laptop"],
    ["Private jet", "plane"],
    ["Bugati", "car"],
    ["Gaming laptop", "laptop"],
    ["Car insurance", "shield"],
    ["Home renovation", "hammer"],
    ["MacBook Pro", "laptop"],
    ["PS5", "gamepad"],
    ["Wedding fund", "gem"],
  ] as const)("maps %s to %s", (name, expected) => {
    expect(inferGoalIconValue(name)).toBe(expected);
  });

  it("keeps repeated recognised goals on their true semantic icon", () => {
    const assignments = getDistinctGoalPresentationAssignments([
      { id: "1", name: "Bugatti", icon: "target" },
      { id: "2", name: "Corolla", icon: "flag" },
      { id: "3", name: "Private jet", icon: "target" },
      { id: "4", name: "Banglow", icon: "target" },
      { id: "5", name: "Laptop", icon: "target" },
    ]);

    expect(assignments.map((assignment) => assignment.iconValue)).toEqual([
      "car",
      "car",
      "plane",
      "home",
      "laptop",
    ]);
  });

  it("uses only neutral icons when a name has no semantic signal", () => {
    const assignments = getDistinctGoalPresentationAssignments([
      { id: "alpha", name: "Alpha" },
      { id: "beta", name: "Beta" },
      { id: "gamma", name: "Gamma" },
    ]);

    expect(new Set(assignments.map((assignment) => assignment.iconValue))).toEqual(
      new Set(["target", "flag", "sparkles"]),
    );
  });
});
