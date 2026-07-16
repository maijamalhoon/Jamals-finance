"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Mail,
  MailCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  AuthFeedback,
  AuthField,
  AuthModeTabs,
  AuthPasswordField,
  AuthProviderButton,
  AuthSubmitAction,
} from "@/components/auth/AuthControls";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeLoginReason,
  sanitizeInternalRedirect,
} from "@/lib/supabase/session";

type Step = "login" | "signup" | "forgot" | "check-email";
type LoadingMode = "signing" | "creating" | "google" | "sending" | null;
type OAuthProvider = "google";
type AuthFieldName = "email" | "password" | "fullName";
type CheckEmailPurpose = "signup" | "recovery";
type AuthFailure = { message?: string; status?: number };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginReasonMessages = {
  session_expired: "Your session expired. Log in again to continue.",
  auth_unavailable: "Authentication is temporarily unavailable. Please try again shortly.",
  callback_failed: "That sign-in link could not be completed. Please try again.",
} as const;

function onboardingDestination(next: string) {
  return `/onboarding?next=${encodeURIComponent(next)}`;
}

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

function isTemporaryFailure(error: AuthFailure | undefined) {
  const lower = error?.message?.toLowerCase() ?? "";
  return (
    (error?.status ?? 0) >= 500 ||
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("timeout")
  );
}

function getOAuthError(provider: OAuthProvider, error?: AuthFailure) {
  const providerLabel = provider === "google" ? "Google" : "Google";
  const lower = error?.message?.toLowerCase() ?? "";

  if (
    lower.includes("unsupported provider") ||
    lower.includes("provider is not enabled")
  ) {
    return `${providerLabel} sign-in is not available right now. Use email and password instead.`;
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return `Too many ${providerLabel} sign-in attempts. Please wait a moment and try again.`;
  }

  if (isTemporaryFailure(error)) {
    return "We could not reach the authentication service. Check your connection and try again.";
  }

  return `${providerLabel} sign-in could not be completed. Please try again.`;
}

function getSignupError(error?: AuthFailure) {
  const lower = error?.message?.toLowerCase() ?? "";

  if (lower.includes("already") || lower.includes("registered")) {
    return "An account already exists for this email. Log in with your password.";
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many signup attempts. Please wait a moment and try again.";
  }

  if (lower.includes("password")) {
    return "Choose a stronger password and try again.";
  }

  if (isTemporaryFailure(error)) {
    return "We could not reach the authentication service. Check your connection and try again.";
  }

  return "We could not create your account. Check your details and try again.";
}

function getForgotPasswordError(error?: AuthFailure) {
  const lower = error?.message?.toLowerCase() ?? "";

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many reset requests. Please wait a moment and try again.";
  }

  if (lower.includes("invalid") && lower.includes("email")) {
    return "Enter a valid email address.";
  }

  if (isTemporaryFailure(error)) {
    return "We could not reach the authentication service. Check your connection and try again.";
  }

  return "We could not send the reset link. Please try again.";
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.3 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const actionInFlight = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loadingMode, setLoadingMode] = useState<LoadingMode>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthFieldName, string>>>({});
  const [formError, setFormError] = useState("");
  const [reasonMessage, setReasonMessage] = useState("");
  const [checkEmailPurpose, setCheckEmailPurpose] = useState<CheckEmailPurpose>("signup");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [safeNext, setSafeNext] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSafeNext(sanitizeInternalRedirect(params.get("next")));

    if (params.get("mode") === "forgot") setStep("forgot");

    const reason = normalizeLoginReason(params.get("reason"));
    if (reason) setReasonMessage(loginReasonMessages[reason]);
  }, []);

  const isLoading = Boolean(loadingMode);
  const isAuthEntryStep = step === "login" || step === "signup";

  function beginAction(mode: Exclude<LoadingMode, null>) {
    if (actionInFlight.current) return false;
    actionInFlight.current = true;
    setLoadingMode(mode);
    return true;
  }

  function endAction() {
    actionInFlight.current = false;
    setLoadingMode(null);
  }

  function resetActionFeedback() {
    setFieldErrors({});
    setFormError("");
  }

  function focusField(field: AuthFieldName) {
    const refs = {
      email: emailRef,
      password: passwordRef,
      fullName: fullNameRef,
    };
    refs[field].current?.focus();
  }

  function setFieldError(field: AuthFieldName, message: string) {
    setFieldErrors((current) => ({ ...current, [field]: message }));
    focusField(field);
  }

  function clearFieldError(field: AuthFieldName) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function switchStep(nextStep: "login" | "signup" | "forgot") {
    if (actionInFlight.current) return;
    resetActionFeedback();
    setPassword("");
    setStep(nextStep);
  }

  function validateEmailAddress() {
    const nextEmail = cleanEmail(email);

    if (!nextEmail) {
      setFieldError("email", "Enter your email address.");
      return null;
    }

    if (!emailRegex.test(nextEmail)) {
      setFieldError("email", "Enter a valid email address.");
      return null;
    }

    setEmail(nextEmail);
    return nextEmail;
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (actionInFlight.current) return;
    resetActionFeedback();

    const nextEmail = validateEmailAddress();
    if (!nextEmail) return;

    if (!password) {
      setFieldError("password", "Enter your password.");
      return;
    }

    if (!beginAction("signing")) return;

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: nextEmail,
        password,
      });

      if (signInError) {
        endAction();
        setFormError(
          isTemporaryFailure(signInError)
            ? "Authentication is temporarily unavailable. Please try again shortly."
            : "The email or password is incorrect.",
        );
        return;
      }

      router.replace(safeNext);
      router.refresh();
    } catch {
      endAction();
      setFormError("We could not reach the authentication service. Check your connection and try again.");
    }
  }

  async function handleSignup(event: FormEvent) {
    event.preventDefault();
    if (actionInFlight.current) return;
    resetActionFeedback();

    if (!fullName.trim()) {
      setFieldError("fullName", "Enter your full name.");
      return;
    }

    const nextEmail = validateEmailAddress();
    if (!nextEmail) return;

    if (!password || password.length < 6) {
      setFieldError("password", "Use at least 6 characters.");
      return;
    }

    if (!beginAction("creating")) return;

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: nextEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingDestination(safeNext))}`,
        },
      });

      if (signUpError) {
        endAction();
        if (
          signUpError.message.toLowerCase().includes("already") ||
          signUpError.message.toLowerCase().includes("registered")
        ) {
          setPassword("");
          setStep("login");
        }
        setFormError(getSignupError(signUpError));
        return;
      }

      if (data.session) {
        router.replace(onboardingDestination(safeNext));
        router.refresh();
        return;
      }

      endAction();
      setSubmittedEmail(nextEmail);
      setCheckEmailPurpose("signup");
      setStep("check-email");
    } catch {
      endAction();
      setFormError(getSignupError({ status: 503 }));
    }
  }

  async function handleOAuthSignIn(provider: OAuthProvider) {
    if (!isAuthEntryStep || actionInFlight.current) return;
    resetActionFeedback();
    if (!beginAction("google")) return;

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingDestination(safeNext))}`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });

      if (oauthError) {
        endAction();
        setFormError(getOAuthError(provider, oauthError));
      }
    } catch {
      endAction();
      setFormError(getOAuthError(provider, { status: 503 }));
    }
  }

  async function handleForgotPassword(event: FormEvent) {
    event.preventDefault();
    if (actionInFlight.current) return;
    resetActionFeedback();

    const nextEmail = validateEmailAddress();
    if (!nextEmail) return;
    if (!beginAction("sending")) return;

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        nextEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (resetError) {
        endAction();
        setFormError(getForgotPasswordError(resetError));
        return;
      }

      endAction();
      setSubmittedEmail(nextEmail);
      setCheckEmailPurpose("recovery");
      setStep("check-email");
    } catch {
      endAction();
      setFormError(getForgotPasswordError({ status: 503 }));
    }
  }

  const title =
    step === "login" ? "Welcome back"
    : step === "signup" ? "Create your account"
    : step === "forgot" ? "Reset your password"
    : "Check your email";

  const description =
    step === "login" ? "Log in to continue to your private finance workspace."
    : step === "signup" ? "Create your Jamals Finance account, then complete one short profile step."
    : step === "forgot" ? "Enter your email and we will send password-recovery instructions without revealing account status."
    : checkEmailPurpose === "signup"
      ? "Confirm your email to continue to profile setup."
      : "Use the recovery link in your email to choose a new password.";

  const formErrorFeedback = (
    <div className="auth-feedback-slot">
      {formError ? <AuthFeedback tone="danger">{formError}</AuthFeedback> : null}
    </div>
  );

  return (
    <AuthShell
      compact={step !== "signup"}
      eyebrow={
        step === "login" ? "Account access"
        : step === "signup" ? "New workspace"
        : step === "forgot" ? "Password recovery"
        : "Email confirmation"
      }
      title={title}
      description={description}
      icon={step === "check-email" ? MailCheck : ShieldCheck}
    >
      {isAuthEntryStep ? (
        <AuthModeTabs active={step} disabled={isLoading} onChange={switchStep} />
      ) : null}

      {reasonMessage && isAuthEntryStep ? (
        <AuthFeedback tone="info" className="mt-4">
          {reasonMessage}
        </AuthFeedback>
      ) : null}

      {isAuthEntryStep ? (
        <div className="mt-4 space-y-3">
          <AuthProviderButton
            icon={<GoogleLogo />}
            onClick={() => void handleOAuthSignIn("google")}
            disabled={isLoading}
            loading={loadingMode === "google"}
            loadingLabel="Opening Google…"
          >
            {step === "signup" ? "Sign up with Google" : "Continue with Google"}
          </AuthProviderButton>

          <div className="auth-divider">
            <span aria-hidden="true" />
            <strong>or continue with email</strong>
            <span aria-hidden="true" />
          </div>
        </div>
      ) : null}

      {step === "login" ? (
        <form id="auth-login-panel" onSubmit={handleLogin} noValidate className="mt-4 space-y-1" aria-busy={isLoading}>
          <AuthField
            id="login-email"
            name="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError("email");
            }}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            disabled={isLoading}
            error={fieldErrors.email}
            inputRef={emailRef}
            icon={<Mail className="h-4 w-4" />}
          />

          <AuthPasswordField
            id="login-password"
            name="password"
            label="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError("password");
            }}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isLoading}
            error={fieldErrors.password}
            inputRef={passwordRef}
            icon={<LockKeyhole className="h-4 w-4" />}
          />

          {formErrorFeedback}

          <AuthSubmitAction type="submit" loading={loadingMode === "signing"} loadingLabel="Logging in…" disabled={isLoading}>
            Log in <ArrowRight className="h-4 w-4" />
          </AuthSubmitAction>

          <Button type="button" variant="ghost" onClick={() => switchStep("forgot")} disabled={isLoading} className="w-full text-text-secondary">
            Forgot password?
          </Button>
        </form>
      ) : null}

      {step === "signup" ? (
        <form id="auth-signup-panel" onSubmit={handleSignup} noValidate className="mt-4 space-y-1" aria-busy={isLoading}>
          <AuthField
            id="signup-full-name"
            name="full_name"
            label="Full name"
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              clearFieldError("fullName");
            }}
            placeholder="Enter your full name"
            autoComplete="name"
            disabled={isLoading}
            error={fieldErrors.fullName}
            inputRef={fullNameRef}
            icon={<UserRound className="h-4 w-4" />}
          />

          <AuthField
            id="signup-email"
            name="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError("email");
            }}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            disabled={isLoading}
            error={fieldErrors.email}
            inputRef={emailRef}
            icon={<Mail className="h-4 w-4" />}
          />

          <AuthPasswordField
            id="signup-password"
            name="password"
            label="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError("password");
            }}
            placeholder="Create a password"
            autoComplete="new-password"
            disabled={isLoading}
            error={fieldErrors.password}
            helper="Use at least 6 characters."
            inputRef={passwordRef}
            icon={<LockKeyhole className="h-4 w-4" />}
          />

          {formErrorFeedback}

          <AuthSubmitAction type="submit" loading={loadingMode === "creating"} loadingLabel="Creating account…" disabled={isLoading}>
            Create account <ArrowRight className="h-4 w-4" />
          </AuthSubmitAction>
        </form>
      ) : null}

      {step === "forgot" ? (
        <form onSubmit={handleForgotPassword} noValidate className="space-y-2" aria-busy={isLoading}>
          <Button type="button" variant="ghost" onClick={() => switchStep("login")} disabled={isLoading} className="-ml-2 text-text-secondary">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Button>

          <AuthField
            id="forgot-email"
            name="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError("email");
            }}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            disabled={isLoading}
            error={fieldErrors.email}
            inputRef={emailRef}
            icon={<Mail className="h-4 w-4" />}
          />

          {formErrorFeedback}

          <AuthSubmitAction type="submit" loading={loadingMode === "sending"} loadingLabel="Sending reset link…" disabled={isLoading}>
            Send reset link <ArrowRight className="h-4 w-4" />
          </AuthSubmitAction>
        </form>
      ) : null}

      {step === "check-email" ? (
        <div className="space-y-4 text-center">
          <div className="auth-status-icon mx-auto" data-tone="success">
            <MailCheck className="h-7 w-7" aria-hidden="true" />
          </div>

          <AuthFeedback tone={checkEmailPurpose === "signup" ? "success" : "info"} className="text-left">
            {checkEmailPurpose === "signup"
              ? "Your account needs email confirmation before profile setup."
              : "If this address is eligible, password recovery instructions will arrive shortly."}
          </AuthFeedback>

          {submittedEmail ? (
            <div className="auth-identity-row text-left">
              <Mail className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
              <span className="min-w-0 break-all font-medium text-text-primary">{submittedEmail}</span>
            </div>
          ) : null}

          <p className="text-sm leading-6 text-text-secondary">
            Check your inbox and spam folder, then follow the link in that email.
          </p>

          <Button type="button" variant="outline" size="lg" onClick={() => switchStep("login")} className="w-full">
            Back to login
          </Button>
        </div>
      ) : null}

    </AuthShell>
  );
}
