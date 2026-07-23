"use client";

import {
  Check,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "@/components/icons/jalvoro/compat";
import {
  type ComponentProps,
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { cn } from "@/lib/utils";

type AuthFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "name" | "size"
> & {
  id: string;
  name: string;
  label: string;
  icon?: ReactNode;
  error?: string;
  helper?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  endAction?: ReactNode;
};

export function AuthField({
  id,
  name,
  label,
  icon,
  error,
  helper,
  inputRef,
  endAction,
  className,
  "aria-describedby": suppliedDescription,
  ...inputProps
}: AuthFieldProps) {
  const messageId = error ? `${id}-error` : helper ? `${id}-help` : undefined;
  const describedBy = [suppliedDescription, messageId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="auth-field min-w-0">
      <label htmlFor={id} className="auth-field-label">
        {label}
      </label>
      <div className="auth-field-control">
        {icon ? (
          <span className="auth-field-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "auth-input",
            icon && "auth-input-with-start",
            endAction && "auth-input-with-end",
            className,
          )}
        />
        {endAction}
      </div>
      <div className="auth-field-message" aria-live="polite">
        {error ? (
          <p id={`${id}-error`} className="auth-field-error">
            {error}
          </p>
        ) : helper ? (
          <p id={`${id}-help`} className="auth-field-helper">
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function AuthPasswordField({
  disabled,
  helper,
  onBlur,
  onKeyDown,
  onKeyUp,
  ...props
}: Omit<AuthFieldProps, "type" | "endAction">) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  return (
    <AuthField
      {...props}
      type={visible ? "text" : "password"}
      disabled={disabled}
      helper={capsLock ? "Caps Lock is on." : helper}
      onKeyDown={(event) => {
        setCapsLock(event.getModifierState("CapsLock"));
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        setCapsLock(event.getModifierState("CapsLock"));
        onKeyUp?.(event);
      }}
      onBlur={(event) => {
        setCapsLock(false);
        onBlur?.(event);
      }}
      endAction={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          disabled={disabled}
          className="auth-password-toggle finance-focus"
          aria-label={visible ? `Hide ${props.label.toLowerCase()}` : `Show ${props.label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      }
    />
  );
}

export function AuthPasswordRequirements({
  password,
  minimumLength,
}: {
  password: string;
  minimumLength: number;
}) {
  const hasMinimumLength = password.length >= minimumLength;

  return (
    <div className="auth-password-requirements" aria-live="polite">
      <p>Password requirement</p>
      <div data-met={hasMinimumLength || undefined}>
        {hasMinimumLength ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Circle className="h-4 w-4" aria-hidden="true" />
        )}
        <span>At least {minimumLength} characters</span>
      </div>
    </div>
  );
}

export function AuthSubmitAction({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      size="lg"
      className={cn("auth-primary-action w-full", className)}
      {...props}
    />
  );
}

export function AuthProviderButton({
  icon,
  loading,
  loadingLabel,
  children,
  className,
  disabled,
  ...props
}: ComponentProps<"button"> & {
  icon: ReactNode;
  loading?: boolean;
  loadingLabel: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("auth-provider-action", className)}
      {...props}
    >
      <span className="grid h-5 w-5 place-items-center" aria-hidden="true">
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      </span>
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}

export function AuthModeTabs({
  active,
  disabled,
  onChange,
}: {
  active: "login" | "signup";
  disabled?: boolean;
  onChange: (mode: "login" | "signup") => void;
}) {
  return (
    <div className="auth-mode-tabs" role="group" aria-label="Authentication mode">
      {(["login", "signup"] as const).map((mode) => {
        const selected = active === mode;
        const label = mode === "login" ? "Log in" : "Sign up";

        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            disabled={disabled}
            aria-pressed={selected}
            data-active={selected || undefined}
            className="auth-mode-tab"
          >
            <span>{label}</span>
            {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

const feedbackIcons = {
  danger: TriangleAlert,
  warning: TriangleAlert,
  success: CheckCircle2,
  info: Info,
} as const;

export function AuthFeedback({
  tone,
  children,
  className,
  ...props
}: ComponentProps<typeof InlineNotice> & {
  tone: "danger" | "warning" | "success" | "info";
}) {
  const FeedbackIcon = feedbackIcons[tone];

  return (
    <InlineNotice
      tone={tone}
      role={tone === "danger" ? "alert" : props.role}
      aria-live={tone === "danger" ? undefined : "polite"}
      className={cn("auth-feedback", className)}
      {...props}
    >
      <FeedbackIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </InlineNotice>
  );
}
