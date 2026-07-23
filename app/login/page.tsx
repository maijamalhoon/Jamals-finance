"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  AuthPasswordField,
  AuthPasswordRequirements,
  AuthProviderButton,
  AuthSubmitAction,
} from "@/components/auth/AuthControls";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { checkPasswordProtection } from "@/lib/auth/password-protection";
import {
  PASSWORD_MIN_LENGTH,
  validatePasswordPolicy,
} from "@/lib/auth/password-policy";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeLoginReason,
  sanitizeInternalRedirect,
} from "@/lib/supabase/session";

type Step =
  | "entry"
  | "password"
  | "signup-details"
  | "forgot"
  | "check-email";
type AuthMode = "login" | "signup";
type LoadingMode =
  | "signing"
  | "creating"
  | "google"
  | "sending"
  | "resending"
  | null;
type OAuthProvider = "google";
type AuthFieldName = "email" | "password" | "fullName";
type CheckEmailPurpose = "signup" | "recovery";
type AuthFailure = {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resendCooldownSeconds = 60;
const googleAuthEnabled =
  process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

const loginReasonMessages = {
  session_expired: "Your session expired. Log in again to continue.",
  auth_unavailable:
    "Authentication is temporarily unavailable. Please try again shortly.",
  callback_failed:
    "That sign-in request could not be completed. Try again or use email and password.",
} as const;

function onboardingDestination(next: string) {
  return `/onboarding?next=${encodeURIComponent(next)}`;
}

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!local || !domain) return value;

  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"\u2022".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function isTemporaryFailure(error: AuthFailure | undefined) {
  const lower = error?.message?.toLowerCase() ?? "";
  return (
    (error?.status ?? 0) >= 500 ||
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("timeout") ||
    lower.includes("temporarily unavailable")
  );
}

function isRateLimited(error: AuthFailure | undefined) {
  const lower = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return lower.includes("rate limit") || lower.includes("too many");
}

function isEmailUnconfirmed(error: AuthFailure | undefined) {
  const lower = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return lower.includes("email_not_confirmed") || lower.includes("email not confirmed");
}

function isSecurityCheckFailure(error: AuthFailure | undefined) {
  const lower = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return lower.includes("captcha") || lower.includes("security check");
}

function getLoginError(error?: AuthFailure) {
  const lower = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();

  if (isRateLimited(error)) {
    return "Too many sign-in attempts. Wait a moment, then try again or reset your password.";
  }

  if (isSecurityCheckFailure(error)) {
    return "The security check could not be completed. Refresh the page and try again.";
  }

  if (lower.includes("banned") || lower.includes("disabled")) {
    return "This account cannot sign in right now. Use password recovery if you believe this is unexpected.";
  }

  if (lower.includes("weak_password") || lower.includes("weak password")) {
    return "This password no longer meets the account security policy. Reset it to continue.";
  }

  if (isTemporaryFailure(error)) {
    return "Authentication is temporarily unavailable. Check your connection and try again.";
  }

  return "The email or password is incorrect. Try again or reset your password.";
}

function getOAuthError(provider: OAuthProvider, error?: AuthFailure) {
  const providerLabel = provider === "google" ? "Google" : "Google";
  const lower = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();

  if (lower.includes("access_denied") || lower.includes("cancel")) {
    return `${providerLabel} sign-in was cancelled. Try again or use email and password.`;
  }

  if (
    lower.includes("unsupported provider") ||
    lower.includes("provider is not enabled")
  ) {
    return `${providerLabel} sign-in is not available right now. Use email and password instead.`;
  }

  if (isRateLimited(error)) {
    return `Too many ${providerLabel} sign-in attempts. Wait a moment and try again.`;
  }

  if (isTemporaryFailure(error)) {
    return "We could not reach the authentication service. Check your connection and try again.";
  }

  return `${providerLabel} sign-in could not be completed. Try again or use email and password.`;
}

function getSignupError(error?: AuthFailure) {
  const lower = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();

  if (isRateLimited(error)) {
    return "Too many account-creation attempts. Wait a moment and try again.";
  }

  if (isSecurityCheckFailure(error)) {
    return "The security check could not be completed. Refresh the page and try again.";
  }

  if (
    lower.includes("weak_password") ||
    lower.includes("password") ||
    lower.includes("pwned") ||
    lower.includes("leaked")
  ) {
    return "This password does not meet the account security policy. Choose a longer, less common password.";
  }

  if (isTemporaryFailure(error)) {
    return "We could not reach the authentication service. Check your connection and try again.";
  }

  return "We could not create the account. Check your details, or log in if you already have an account.";
}

function getEmailDeliveryError(error?: AuthFailure) {
  if (isRateLimited(error)) {
    return "Too many email requests. Wait for the countdown, then try again.";
  }

  if (isSecurityCheckFailure(error)) {
    return "The security check could not be completed. Refresh the page and try again.";
  }

  if (isTemporaryFailure(error)) {
    return "We could not reach the authentication service. Check your connection and try again.";
  }

  return "We could not request that email. Please try again.";
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
  const statusRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>("entry");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loadingMode, setLoadingMode] = useState<LoadingMode>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<AuthFieldName, string>>
  >({});
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [reasonMessage, setReasonMessage] = useState("");
  const [checkEmailPurpose, setCheckEmailPurpose] =
    useState<CheckEmailPurpose>("signup");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [safeNext, setSafeNext] = useState("/dashboard");
  const [isOnline, setIsOnline] = useState(true);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSafeNext(sanitizeInternalRedirect(params.get("next")));

    const requestedMode = params.get("mode");
    if (requestedMode === "forgot") {
      setStep("forgot");
    } else if (requestedMode === "signup") {
      setAuthMode("signup");
    }

    const reason = normalizeLoginReason(params.get("reason"));
    if (reason) setReasonMessage(loginReasonMessages[reason]);

    const updateConnectionState = () => setIsOnline(navigator.onLine);
    updateConnectionState();
    window.addEventListener("online", updateConnectionState);
    window.addEventListener("offline", updateConnectionState);

    return () => {
      window.removeEventListener("online", updateConnectionState);
      window.removeEventListener("offline", updateConnectionState);
    };
  }, []);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      if (step === "entry" || step === "forgot") emailRef.current?.focus();
      if (step === "password") passwordRef.current?.focus();
      if (step === "signup-details") fullNameRef.current?.focus();
      if (step === "check-email") statusRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [step]);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const isLoading = Boolean(loadingMode);
  const isEntryStep = step === "entry";

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
    setStatusMessage("");
  }

  function ensureOnline() {
    if (navigator.onLine) return true;
    setIsOnline(false);
    setFormError("You are offline. Check your internet connection and try again.");
    return false;
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

  function switchAuthMode(mode: AuthMode) {
    if (actionInFlight.current) return;
    resetActionFeedback();
    setPassword("");
    setAuthMode(mode);
    setStep("entry");
  }

  function returnToEntry(mode: AuthMode = authMode) {
    if (actionInFlight.current) return;
    resetActionFeedback();
    setPassword("");
    setAuthMode(mode);
    setStep("entry");
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

  function validateEmailOnBlur() {
    const nextEmail = cleanEmail(email);
    if (!nextEmail) return;

    if (!emailRegex.test(nextEmail)) {
      setFieldErrors((current) => ({
        ...current,
        email: "Enter a valid email address.",
      }));
      return;
    }

    setEmail(nextEmail);
    clearFieldError("email");
  }

  function handleEmailContinue(event: FormEvent) {
    event.preventDefault();
    if (actionInFlight.current) return;
    resetActionFeedback();

    const nextEmail = validateEmailAddress();
    if (!nextEmail) return;

    setSubmittedEmail(nextEmail);
    setPassword("");
    setStep(authMode === "signup" ? "signup-details" : "password");
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

    if (!ensureOnline() || !beginAction("signing")) return;

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: nextEmail,
        password,
      });

      if (signInError) {
        endAction();

        if (isEmailUnconfirmed(signInError)) {
          setPassword("");
          setSubmittedEmail(nextEmail);
          setCheckEmailPurpose("signup");
          setResendSeconds(0);
          setStep("check-email");
          return;
        }

        setFormError(getLoginError(signInError));
        return;
      }

      router.replace(safeNext);
      router.refresh();
    } catch {
      endAction();
      setFormError(
        "We could not reach the authentication service. Check your connection and try again.",
      );
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

    const passwordPolicy = validatePasswordPolicy(password);
    if (!passwordPolicy.ok) {
      setFieldError("password", passwordPolicy.error);
      return;
    }

    if (!ensureOnline() || !beginAction("creating")) return;

    try {
      const passwordProtection = await checkPasswordProtection(password);
      if (!passwordProtection.ok) {
        endAction();
        setFieldError("password", passwordProtection.error);
        return;
      }

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
        setFormError(getSignupError(signUpError));
        return;
      }

      if (data.session) {
        router.replace(onboardingDestination(safeNext));
        router.refresh();
        return;
      }

      endAction();
      setPassword("");
      setSubmittedEmail(nextEmail);
      setCheckEmailPurpose("signup");
      setResendSeconds(resendCooldownSeconds);
      setStep("check-email");
    } catch {
      endAction();
      setFormError(getSignupError({ status: 503 }));
    }
  }

  async function handleOAuthSignIn(provider: OAuthProvider) {
    if (!isEntryStep || !googleAuthEnabled || actionInFlight.current) return;
    resetActionFeedback();
    if (!ensureOnline() || !beginAction("google")) return;

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingDestination(safeNext))}`,
          queryParams: { prompt: "select_account" },
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

  async function requestPasswordReset(nextEmail: string) {
    return supabase.auth.resetPasswordForEmail(nextEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  }

  async function handleForgotPassword(event: FormEvent) {
    event.preventDefault();
    if (actionInFlight.current) return;
    resetActionFeedback();

    const nextEmail = validateEmailAddress();
    if (!nextEmail) return;
    if (!ensureOnline() || !beginAction("sending")) return;

    try {
      const { error: resetError } = await requestPasswordReset(nextEmail);

      if (resetError) {
        endAction();
        setFormError(getEmailDeliveryError(resetError));
        return;
      }

      endAction();
      setSubmittedEmail(nextEmail);
      setCheckEmailPurpose("recovery");
      setResendSeconds(resendCooldownSeconds);
      setStep("check-email");
    } catch {
      endAction();
      setFormError(getEmailDeliveryError({ status: 503 }));
    }
  }

  async function handleResendEmail() {
    if (
      !submittedEmail ||
      resendSeconds > 0 ||
      actionInFlight.current
    ) {
      return;
    }

    resetActionFeedback();
    if (!ensureOnline() || !beginAction("resending")) return;

    try {
      const result =
        checkEmailPurpose === "signup"
          ? await supabase.auth.resend({
              type: "signup",
              email: submittedEmail,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingDestination(safeNext))}`,
              },
            })
          : await requestPasswordReset(submittedEmail);

      if (result.error) {
        endAction();
        setFormError(getEmailDeliveryError(result.error));
        return;
      }

      endAction();
      setResendSeconds(resendCooldownSeconds);
      setStatusMessage(
        checkEmailPurpose === "signup"
          ? "A new confirmation email was requested. Delivery can take a moment."
          : "New recovery instructions were requested. Delivery can take a moment.",
      );
    } catch {
      endAction();
      setFormError(getEmailDeliveryError({ status: 503 }));
    }
  }

  function changeSubmittedEmail() {
    if (actionInFlight.current) return;
    resetActionFeedback();
    setEmail(submittedEmail);
    setPassword("");
    setResendSeconds(0);

    if (checkEmailPurpose === "signup") {
      setAuthMode("signup");
      setStep("entry");
    } else {
      setStep("forgot");
    }
  }

  const title =
    step === "entry"
      ? authMode === "signup"
        ? "Create your account"
        : "Welcome back"
      : step === "password"
        ? "Enter your password"
        : step === "signup-details"
          ? "Finish creating your account"
          : step === "forgot"
            ? "Reset your password"
            : "Check your email";

  const description =
    step === "entry"
      ? authMode === "signup"
        ? "Start with your email or continue securely with Google."
        : "Continue to your private finance workspace."
      : step === "password"
        ? "Use the password connected to this email address."
        : step === "signup-details"
          ? "Add the required details, then confirm your email before profile setup."
          : step === "forgot"
            ? "We will request recovery instructions without revealing whether an account exists."
            : checkEmailPurpose === "signup"
              ? "If confirmation is required, use the email link before continuing to profile setup."
              : "Use the recovery link in your email to choose a new password.";

  const eyebrow =
    step === "entry"
      ? authMode === "signup"
        ? "New account"
        : "Account access"
      : step === "password"
        ? "Password sign-in"
        : step === "signup-details"
          ? "Account details"
          : step === "forgot"
            ? "Password recovery"
            : "Email confirmation";

  const progress =
    step === "entry"
      ? "Step 1 of 2"
      : step === "password" || step === "signup-details"
        ? "Step 2 of 2"
        : undefined;

  const formErrorFeedback = (
    <div className="auth-feedback-slot">
      {formError ? <AuthFeedback tone="danger">{formError}</AuthFeedback> : null}
    </div>
  );

  const emailField = (
    <AuthField
      id="auth-email"
      name="email"
      label="Email address"
      type="email"
      value={email}
      onChange={(event) => {
        setEmail(event.target.value);
        clearFieldError("email");
      }}
      onBlur={validateEmailOnBlur}
      placeholder="you@example.com"
      autoComplete="email"
      inputMode="email"
      spellCheck={false}
      autoCapitalize="none"
      disabled={isLoading}
      error={fieldErrors.email}
      inputRef={emailRef}
      icon={<Mail className="h-4 w-4" />}
    />
  );

  return (
    <AuthShell
      compact
      minimal
      eyebrow={eyebrow}
      progress={progress}
      title={title}
      description={description}
      icon={step === "check-email" ? MailCheck : ShieldCheck}
    >
      <div key={`${step}-${authMode}`} className="auth-step motion-reveal">
        {reasonMessage && step === "entry" ? (
          <AuthFeedback tone="info" className="mb-4">
            {reasonMessage}
          </AuthFeedback>
        ) : null}

        {!isOnline ? (
          <AuthFeedback tone="warning" role="status" className="mb-4">
            You are offline. Reconnect before continuing.
          </AuthFeedback>
        ) : null}

        {step === "entry" ? (
          <>
            {googleAuthEnabled ? (
              <div className="space-y-4">
                <AuthProviderButton
                  icon={<GoogleLogo />}
                  onClick={() => void handleOAuthSignIn("google")}
                  disabled={isLoading || !isOnline}
                  loading={loadingMode === "google"}
                  loadingLabel="Opening Google..."
                >
                  Continue with Google
                </AuthProviderButton>

                <div className="auth-divider">
                  <span aria-hidden="true" />
                  <strong>or</strong>
                  <span aria-hidden="true" />
                </div>
              </div>
            ) : null}

            <form
              method="post"
              action="/login"
              onSubmit={handleEmailContinue}
              noValidate
              className={googleAuthEnabled ? "mt-4 space-y-1" : "space-y-1"}
              aria-busy={isLoading}
            >
              {emailField}
              {formErrorFeedback}
              <AuthSubmitAction type="submit" disabled={isLoading}>
                Continue <ArrowRight className="h-4 w-4" />
              </AuthSubmitAction>
            </form>

            <p className="auth-mode-switch">
              {authMode === "login" ? "New to Jamal's Finance?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => switchAuthMode(authMode === "login" ? "signup" : "login")}
                disabled={isLoading}
                className="finance-focus"
              >
                {authMode === "login" ? "Create an account" : "Log in"}
              </button>
            </p>

            <p className="auth-legal-copy">
              By continuing, you acknowledge the service&apos;s{" "}
              <Link href="/#privacy" className="finance-focus">
                privacy information
              </Link>
              .
            </p>
          </>
        ) : null}

        {step === "password" ? (
          <form
            method="post"
            action="/login"
            onSubmit={handleLogin}
            noValidate
            className="space-y-1"
            aria-busy={isLoading}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => returnToEntry("login")}
              disabled={isLoading}
              className="auth-step-back"
            >
              <ArrowLeft className="h-4 w-4" /> Use another account
            </Button>

            <AuthField
              id="login-email"
              name="email"
              label="Email address"
              type="email"
              value={email}
              readOnly
              autoComplete="username"
              className="auth-input-with-inline-action"
              error={fieldErrors.email}
              icon={<Mail className="h-4 w-4" />}
              endAction={
                <button
                  type="button"
                  onClick={() => returnToEntry("login")}
                  disabled={isLoading}
                  className="auth-inline-field-action finance-focus"
                >
                  Change
                </button>
              }
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetActionFeedback();
                  setPassword("");
                  setStep("forgot");
                }}
                disabled={isLoading}
                className="auth-text-action finance-focus"
              >
                Forgot password?
              </button>
            </div>

            {formErrorFeedback}

            <AuthSubmitAction
              type="submit"
              loading={loadingMode === "signing"}
              loadingLabel="Signing you in..."
              disabled={isLoading || !isOnline}
            >
              Log in <ArrowRight className="h-4 w-4" />
            </AuthSubmitAction>

            <Button
              type="button"
              variant="ghost"
              onClick={() => returnToEntry("login")}
              disabled={isLoading}
              className="w-full text-text-secondary"
            >
              Try another sign-in method
            </Button>
          </form>
        ) : null}

        {step === "signup-details" ? (
          <form
            method="post"
            action="/login"
            onSubmit={handleSignup}
            noValidate
            className="space-y-1"
            aria-busy={isLoading}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => returnToEntry("signup")}
              disabled={isLoading}
              className="auth-step-back"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <AuthField
              id="signup-email"
              name="email"
              label="Email address"
              type="email"
              value={email}
              readOnly
              autoComplete="email"
              className="auth-input-with-inline-action"
              error={fieldErrors.email}
              icon={<Mail className="h-4 w-4" />}
              endAction={
                <button
                  type="button"
                  onClick={() => returnToEntry("signup")}
                  disabled={isLoading}
                  className="auth-inline-field-action finance-focus"
                >
                  Change
                </button>
              }
            />

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
              helper={`Use at least ${PASSWORD_MIN_LENGTH} characters with a letter and a number or symbol. Known breached passwords are rejected on submit.`}
              inputRef={passwordRef}
              icon={<LockKeyhole className="h-4 w-4" />}
            />

            <AuthPasswordRequirements
              password={password}
              minimumLength={PASSWORD_MIN_LENGTH}
            />

            {formErrorFeedback}

            <AuthSubmitAction
              type="submit"
              loading={loadingMode === "creating"}
              loadingLabel="Creating your account..."
              disabled={isLoading || !isOnline}
            >
              Create account <ArrowRight className="h-4 w-4" />
            </AuthSubmitAction>
          </form>
        ) : null}

        {step === "forgot" ? (
          <form
            method="post"
            action="/login"
            onSubmit={handleForgotPassword}
            noValidate
            className="space-y-2"
            aria-busy={isLoading}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => returnToEntry("login")}
              disabled={isLoading}
              className="auth-step-back"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Button>

            {emailField}
            {formErrorFeedback}

            <AuthSubmitAction
              type="submit"
              loading={loadingMode === "sending"}
              loadingLabel="Sending reset instructions..."
              disabled={isLoading || !isOnline}
            >
              Send reset link <ArrowRight className="h-4 w-4" />
            </AuthSubmitAction>
          </form>
        ) : null}

        {step === "check-email" ? (
          <div
            ref={statusRef}
            tabIndex={-1}
            className="space-y-4 text-center outline-none"
          >
            <div className="auth-status-icon mx-auto" data-tone="info">
              <MailCheck className="h-7 w-7" aria-hidden="true" />
            </div>

            <AuthFeedback
              tone="info"
              className="text-left"
            >
              {checkEmailPurpose === "signup"
                ? "If this address can be used to create an account, a confirmation email will arrive. Its link is time-limited and can be used once."
                : "If this address supports password sign-in, recovery instructions will arrive shortly."}
            </AuthFeedback>

            {submittedEmail ? (
              <div className="auth-identity-row text-left">
                <Mail
                  className="h-4 w-4 shrink-0 text-text-tertiary"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-all font-medium text-text-primary">
                  {maskEmail(submittedEmail)}
                </span>
              </div>
            ) : null}

            <p className="text-sm leading-6 text-text-secondary">
              Check your inbox and spam folder. Delivery can take a few minutes.
            </p>

            {statusMessage ? (
              <AuthFeedback tone="success" className="text-left">
                {statusMessage}
              </AuthFeedback>
            ) : null}

            {formError ? (
              <AuthFeedback tone="danger" className="text-left">
                {formError}
              </AuthFeedback>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void handleResendEmail()}
              loading={loadingMode === "resending"}
              loadingLabel="Requesting another email..."
              disabled={isLoading || !isOnline || resendSeconds > 0}
              className="w-full"
            >
              {resendSeconds > 0
                ? `Send again in ${resendSeconds}s`
                : checkEmailPurpose === "signup"
                  ? "Resend confirmation email"
                  : "Send recovery instructions again"}
            </Button>

            <div className="grid gap-1 sm:grid-cols-2">
              <Button
                type="button"
                variant="ghost"
                onClick={changeSubmittedEmail}
                disabled={isLoading}
                className="w-full text-text-secondary"
              >
                Change email
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => switchAuthMode("login")}
                disabled={isLoading}
                className="w-full text-text-secondary"
              >
                Back to login
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AuthShell>
  );
}
