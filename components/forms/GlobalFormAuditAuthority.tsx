"use client";

const GLOBAL_FORM_AUDIT_STYLE = `
:root {
  --jf-global-form-modal-width: 36rem;
  --jf-global-form-wide-modal-width: 46rem;
  --jf-global-form-control-height: clamp(
    3rem,
    calc(2.95rem + 0.2vw),
    3.125rem
  );
  --jf-global-date-control-height: var(--jf-global-form-control-height);
  --jf-global-multiline-control-height: var(--jf-global-form-control-height);
  --jf-global-final-action-height: var(--jf-global-form-control-height);
  --jf-global-form-action-height: var(--jf-global-form-control-height);
  --jf-global-final-action-radius: var(--oneui-control-radius, 1rem);
  --jf-global-form-action-radius: var(--jf-global-final-action-radius);
  --jf-global-form-side-padding: clamp(1rem, 2vw, 1.25rem);
  --jf-global-form-edge-gap: clamp(0.875rem, 1.5vw, 1rem);
}

/*
 * Every normal dashboard form uses one width. Its total height remains content
 * driven; only the body becomes scrollable when the viewport is too short.
 */
html body [data-slot="dialog-content"].finance-modal-content.finance-modal-content.finance-modal-content,
html body [role="dialog"].finance-modal-content.finance-modal-content.finance-modal-content {
  position: fixed !important;
  top: 50vh !important;
  top: 50svh !important;
  right: auto !important;
  bottom: auto !important;
  left: 50vw !important;
  box-sizing: border-box !important;
  width: calc(100vw - 1rem) !important;
  max-width: var(--jf-global-form-modal-width) !important;
  height: max-content !important;
  min-height: 0 !important;
  max-height: calc(100vh - 1rem) !important;
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

@media (min-width: 640px) {
  html body [data-slot="dialog-content"].finance-modal-content.finance-modal-content.finance-modal-content,
  html body [role="dialog"].finance-modal-content.finance-modal-content.finance-modal-content {
    width: min(
      calc(100vw - 2rem),
      var(--jf-global-form-modal-width)
    ) !important;
  }
}

@media (max-width: 1023px) {
  html body [data-slot="dialog-content"].finance-modal-content.finance-modal-content.finance-modal-content,
  html body [role="dialog"].finance-modal-content.finance-modal-content.finance-modal-content {
    width: min(
      calc(
        100vw - 1rem - env(safe-area-inset-left) -
          env(safe-area-inset-right)
      ),
      var(--jf-global-form-modal-width)
    ) !important;
  }
}

/* Category management is the only intentionally wider management workspace. */
html body :is(
    [data-slot="dialog-content"].finance-modal-content:has(#settings-category-name),
    [data-slot="dialog-content"].finance-modal-content:has(#persistent-category-name),
    [data-slot="dialog-content"].finance-modal-content:not(:has(#settings-category-name)):has([role="tablist"])
  ) {
  max-width: var(--jf-global-form-wide-modal-width) !important;
}

@media (min-width: 640px) {
  html body :is(
      [data-slot="dialog-content"].finance-modal-content:has(#settings-category-name),
      [data-slot="dialog-content"].finance-modal-content:has(#persistent-category-name),
      [data-slot="dialog-content"].finance-modal-content:not(:has(#settings-category-name)):has([role="tablist"])
    ) {
    width: min(
      calc(100vw - 2rem),
      var(--jf-global-form-wide-modal-width)
    ) !important;
  }
}

/* Content-fit height contract. */
html body .finance-modal-content > form {
  flex: 0 1 auto !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: inherit !important;
}

html body .finance-modal-content .finance-modal-header,
html body .finance-modal-content .finance-modal-body,
html body .finance-modal-content .finance-modal-footer {
  box-sizing: border-box !important;
  width: 100% !important;
  padding-inline: var(--jf-global-form-side-padding) !important;
  border: 0 !important;
  box-shadow: none !important;
}

html body .finance-modal-content .finance-modal-body {
  flex: 0 1 auto !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: calc(100vh - 9rem) !important;
  max-height: calc(
    100svh - 9rem - env(safe-area-inset-top) -
      env(safe-area-inset-bottom)
  ) !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
}

html body .finance-modal-content .finance-modal-footer {
  flex: 0 0 auto !important;
  padding-top: var(--jf-global-form-edge-gap) !important;
  padding-bottom: calc(
    var(--jf-global-form-edge-gap) + env(safe-area-inset-bottom)
  ) !important;
}

html body .finance-modal-content :is(
    [data-slot="finance-form-field"],
    .finance-form-field
  ) {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

/*
 * One real action footprint. Authored text/loading content remains authoritative;
 * old generated ::after labels are explicitly disabled.
 */
html body :is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-form-action="true"] {
  box-sizing: border-box !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  height: var(--jf-global-final-action-height) !important;
  min-height: var(--jf-global-final-action-height) !important;
  max-height: var(--jf-global-final-action-height) !important;
  padding-inline: 1rem !important;
  border-radius: var(--jf-global-final-action-radius) !important;
  gap: 0 !important;
  font-size: clamp(0.875rem, 1.5vw, 0.95rem) !important;
  font-weight: 800 !important;
  line-height: 1 !important;
  letter-spacing: -0.01em !important;
  white-space: nowrap !important;
}

html body :is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-form-action="true"] > * {
  display: grid !important;
}

html body :is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-form-action="true"] svg {
  display: none !important;
}

html body :is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-form-action="true"]::after,
html body :is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-inline-form-action="true"]::before {
  content: none !important;
  display: none !important;
}

html body :is(.finance-modal-content, [data-slot="dialog-content"])
  button[data-jf-inline-form-action="true"] {
  width: 100% !important;
  margin-top: var(--jf-global-form-edge-gap) !important;
}

/* Settings actions use the same button shell with only semantic color changes. */
html body :is(
    [data-slot="dialog-content"].finance-modal-content:has(#settings-reference-display-name),
    [data-slot="dialog-content"].finance-modal-content:has(#custom-profile-name),
    [data-slot="dialog-content"].finance-modal-content.settings-profile-details-hard
  ) button[data-jf-form-action="true"] {
  border-color: transparent !important;
  background: var(--investment) !important;
  color: var(--text-inverse) !important;
  box-shadow: none !important;
}

html body :is(
    [data-slot="dialog-content"].finance-modal-content:has(#settings-currency-select),
    [data-slot="dialog-content"].finance-modal-content.settings-currency-hard
  ) button[data-jf-form-action="true"] {
  border-color: transparent !important;
  background: var(--info) !important;
  color: var(--text-inverse) !important;
  box-shadow: none !important;
}

html body :is(
    [data-slot="dialog-content"].finance-modal-content:has(#settings-date-format-select),
    [data-slot="dialog-content"].finance-modal-content.settings-date-format-hard
  ) button[data-jf-form-action="true"] {
  border-color: transparent !important;
  background: var(--warning) !important;
  color: var(--text-inverse) !important;
  box-shadow: none !important;
}

html body :is(
    [data-slot="dialog-content"].finance-modal-content:has(.settings-security-panel),
    [data-slot="dialog-content"].finance-modal-content.settings-account-security-hard
  ) .settings-security-panel button[data-jf-form-action="true"] {
  border-color: transparent !important;
  background: var(--info) !important;
  color: var(--text-inverse) !important;
  box-shadow: none !important;
}

html body :is(
    [data-slot="dialog-content"].finance-modal-content:has(.settings-security-panel),
    [data-slot="dialog-content"].finance-modal-content.settings-account-security-hard
  ) .settings-security-panel:last-of-type button[data-jf-form-action="true"]:not(:disabled) {
  background: var(--danger) !important;
  color: var(--text-inverse) !important;
}

html body :is(
    [data-slot="dialog-content"].finance-modal-content:has(.settings-security-panel),
    [data-slot="dialog-content"].finance-modal-content.settings-account-security-hard
  ) .settings-security-panel button[data-jf-form-action="true"]:disabled {
  background: var(--surface-inset) !important;
  color: var(--text-tertiary) !important;
  opacity: 1 !important;
}

html body :is(
    [data-slot="dialog-content"].finance-modal-content:has(.settings-security-panel),
    [data-slot="dialog-content"].finance-modal-content.settings-account-security-hard
  ) .settings-security-panel form .grid:has(> button[data-jf-form-action="true"]) {
  grid-template-columns: minmax(0, 1fr) !important;
}

/* Authentication forms retain their authored labels and semantic colors. */
.auth-primary-action,
.auth-step button.w-full:not(.auth-provider-action),
.jf-auth-card button.w-full:not(.auth-provider-action) {
  box-sizing: border-box !important;
  width: 100% !important;
  height: var(--jf-global-final-action-height) !important;
  min-height: var(--jf-global-final-action-height) !important;
  max-height: var(--jf-global-final-action-height) !important;
  border-radius: var(--jf-global-final-action-radius) !important;
}

.auth-primary-action svg,
.auth-step button.w-full:not(.auth-provider-action) svg,
.jf-auth-card button.w-full:not(.auth-provider-action) svg {
  display: none !important;
}
`;

export default function GlobalFormAuditAuthority() {
  return <style>{GLOBAL_FORM_AUDIT_STYLE}</style>;
}
