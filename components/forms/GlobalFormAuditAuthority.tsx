"use client";

const GLOBAL_FORM_AUDIT_STYLE = `
:root {
  --jf-global-form-control-height: clamp(
    2.875rem,
    calc(2.75rem + 0.3vw),
    3rem
  );
  --jf-global-date-control-height: var(--jf-global-form-control-height);
  --jf-global-multiline-control-height: var(--jf-global-form-control-height);
  --jf-global-final-action-height: clamp(
    2.5rem,
    calc(2.375rem + 0.3vw),
    2.75rem
  );
  --jf-global-form-action-height: var(--jf-global-final-action-height);
  --jf-global-final-action-radius: 1.05rem;
  --jf-global-form-action-radius: var(--jf-global-final-action-radius);
}

/*
 * One viewport contract for every finance modal. The repeated class selector is
 * intentional: it outranks older per-form mobile positioning without touching
 * each form's data, width cap, content, state or submit behavior.
 */
@media (max-width: 1023px) {
  html body [data-slot="dialog-content"].finance-modal-content.finance-modal-content.finance-modal-content,
  html body [role="dialog"].finance-modal-content.finance-modal-content.finance-modal-content {
    position: fixed !important;
    top: 50vh !important;
    top: 50svh !important;
    right: auto !important;
    bottom: auto !important;
    left: 50vw !important;
    box-sizing: border-box !important;
    width: min(
      calc(
        100vw - 1rem - env(safe-area-inset-left) -
          env(safe-area-inset-right)
      ),
      var(--finance-modal-max-width, var(--settings-hard-modal-width, 28rem))
    ) !important;
    max-width: calc(
      100vw - 1rem - env(safe-area-inset-left) -
        env(safe-area-inset-right)
    ) !important;
    height: max-content !important;
    max-height: calc(
      100vh - 1rem - env(safe-area-inset-top) -
        env(safe-area-inset-bottom)
    ) !important;
    max-height: calc(
      100svh - 1rem - env(safe-area-inset-top) -
        env(safe-area-inset-bottom)
    ) !important;
    margin: 0 !important;
    translate: none !important;
    transform: translate3d(-50%, -50%, 0) !important;
    transform-origin: center center !important;
    overflow: hidden !important;
  }

  /* Settings keeps purpose-specific width caps while sharing the same center,
   * safe area and scroll behavior as every other form. */
  html body :is(
      [data-slot="dialog-content"].finance-modal-content:has(#settings-category-name),
      [data-slot="dialog-content"].finance-modal-content:has(#persistent-category-name),
      [data-slot="dialog-content"].finance-modal-content:not(:has(#settings-category-name)):has([role="tablist"])
    ) {
    width: min(
      calc(
        100vw - 1rem - env(safe-area-inset-left) -
          env(safe-area-inset-right)
      ),
      46rem
    ) !important;
  }

  html body :is(
      [data-slot="dialog-content"].finance-modal-content:has(.settings-security-panel),
      [data-slot="dialog-content"].finance-modal-content.settings-account-security-hard
    ) {
    width: min(
      calc(
        100vw - 1rem - env(safe-area-inset-left) -
          env(safe-area-inset-right)
      ),
      36rem
    ) !important;
  }

  html body :is(
      [data-slot="dialog-content"].finance-modal-content:has(#settings-currency-select),
      [data-slot="dialog-content"].finance-modal-content:has(#settings-date-format-select),
      [data-slot="dialog-content"].finance-modal-content:has(#settings-reference-display-name),
      [data-slot="dialog-content"].finance-modal-content:has(#custom-profile-name),
      [data-slot="dialog-content"].finance-modal-content.settings-profile-details-hard,
      [data-slot="dialog-content"].finance-modal-content.settings-currency-hard,
      [data-slot="dialog-content"].finance-modal-content.settings-date-format-hard
    ) {
    width: min(
      calc(
        100vw - 1rem - env(safe-area-inset-left) -
          env(safe-area-inset-right)
      ),
      32rem
    ) !important;
  }

  html body [data-slot="dialog-content"].finance-modal-content.finance-modal-content.finance-modal-content
    :is(form, .finance-modal-body, .finance-modal-footer),
  html body [role="dialog"].finance-modal-content.finance-modal-content.finance-modal-content
    :is(form, .finance-modal-body, .finance-modal-footer) {
    min-width: 0 !important;
    max-width: 100% !important;
  }
}

/* Sign-in/sign-up keep their authored color and label, but join the shared
 * responsive action height/radius and lose decorative inline icons. */
.auth-primary-action {
  box-sizing: border-box !important;
  height: var(--jf-global-final-action-height) !important;
  min-height: var(--jf-global-final-action-height) !important;
  max-height: var(--jf-global-final-action-height) !important;
  border-radius: var(--jf-global-final-action-radius) !important;
  gap: 0 !important;
}

.auth-primary-action svg {
  display: none !important;
}

/* Password recovery and onboarding use the same auth shell. Their full-width
 * actions keep the exact authored label, variant and color, but share the same
 * responsive height/curve and remove decorative arrows/spinners. Provider
 * branding, back controls, mode tabs and password visibility remain untouched. */
.auth-step button.w-full:not(.auth-provider-action),
.jf-auth-card button.w-full:not(.auth-provider-action) {
  box-sizing: border-box !important;
  height: var(--jf-global-final-action-height) !important;
  min-height: var(--jf-global-final-action-height) !important;
  max-height: var(--jf-global-final-action-height) !important;
  border-radius: var(--jf-global-final-action-radius) !important;
}

.auth-step button.w-full:not(.auth-provider-action) svg,
.jf-auth-card button.w-full:not(.auth-provider-action) svg {
  display: none !important;
}

/* Every marked form action keeps its authored semantic color and click logic,
 * while sharing one height, curve, iconless presentation and short label. */
:is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-form-action="true"] {
  box-sizing: border-box !important;
  height: var(--jf-global-final-action-height) !important;
  min-height: var(--jf-global-final-action-height) !important;
  max-height: var(--jf-global-final-action-height) !important;
  border-radius: var(--jf-global-final-action-radius) !important;
  gap: 0 !important;
  font-size: 0 !important;
  line-height: 1 !important;
}

:is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-form-action="true"] > * {
  display: none !important;
}

:is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-form-action="true"] svg {
  display: none !important;
}

:is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-form-action="true"]::after {
  content: attr(data-jf-form-action-label);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  font-size: clamp(0.82rem, 1.6vw, 0.9rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
`;

export default function GlobalFormAuditAuthority() {
  return <style>{GLOBAL_FORM_AUDIT_STYLE}</style>;
}
