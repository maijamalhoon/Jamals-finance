"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useState } from "react";
import { FastForward, Play, Square } from "lucide-react";

type AnimationPreviewMode = "standard" | "fast" | "none";

const ANIMATION_PREVIEW_OPTIONS: Array<{
  value: AnimationPreviewMode;
  label: string;
  icon: ReactNode;
}> = [
  {
    value: "standard",
    label: "Animations",
    icon: <Play size={18} />,
  },
  {
    value: "fast",
    label: "Fast animations",
    icon: <FastForward size={18} />,
  },
  {
    value: "none",
    label: "No animations",
    icon: <Square size={18} />,
  },
];

export default function SettingsAnimationPreviewControl() {
  const [selectedMode, setSelectedMode] =
    useState<AnimationPreviewMode>("standard");

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | null = null;
    const lastIndex = ANIMATION_PREVIEW_OPTIONS.length - 1;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    setSelectedMode(ANIMATION_PREVIEW_OPTIONS[nextIndex].value);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [nextIndex]?.focus();
  }

  return (
    <div
      className="settings-reference-appearance-control settings-reference-animation-control mt-2"
      role="radiogroup"
      aria-label="Animation preference preview"
    >
      {ANIMATION_PREVIEW_OPTIONS.map((option, index) => {
        const active = selectedMode === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-label={option.label}
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => setSelectedMode(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`finance-focus settings-reference-theme-option ${
              active ? "is-active" : ""
            }`}
          >
            <span className="settings-reference-theme-icon" aria-hidden="true">
              {option.icon}
            </span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
