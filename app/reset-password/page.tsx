"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  classifyAuthFailure,
  classifyRecoveryLinkError,
  classifyUserLookupFailure,
  createRecoveryMarker,
  getOrCreateKeyedRecoveryAttempt,
  getPasswordUpdateExceptionMessage,
  getRecoveryRetryOperation,
  isConfirmedRecoveryAuthEvent,
  parseValidRecoveryMarker,
  shouldClearRecoveryMarkerAfterPasswordUpdate,
  type PasswordUpdateOutcome,
  type RecoveryRetryIntent,
} from "@/lib/supabase/session";

type RecoveryState =
  | "checking"
  | "ready"
  | "invalid"
  | "temporarily_unavailable"
  | "updating"
  | "success";

const RECOVERY_MARKER = "jamals-finance:password-recovery";
type RecoveryOutcome = "ready" | "invalid" | "temporarily_unavailable";
type RecoveryExchangeOutcome =
  | "confirmed_recovery"
  | "non_recovery"
  | "invalid"
  | "temporarily_unavailable";
type UserLookupOutcome =
  | "authenticated"
  | "signed_out"
  | "temporarily_unavailable";
type RecoverySignal = {
  resolve: () => void;
  wait: (timeoutMs: number) => Promise<boolean>;
};

const RECOVERY_EVENT_WAIT_MS = 2_000;
const recoveryExchangeAttempts = new Map<
  string,
  Promise<RecoveryExchangeOutcome>
>();
const recoverySignals = new Map<string, RecoverySignal>();

function removeRecoveryParameters() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function hashRecoverySession(sessionId: string) {
  const bytes = new TextEncoder().encode(sessionId);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function createRecoverySignal(): RecoverySignal {
  let confirmed = false;
  let resolveConfirmation: (() => void) | null = null;
  const confirmation = new Promise<void>((resolve) => {
    resolveConfirmation = resolve;
  });

  return {
    resolve() {
      if (confirmed) return;
      confirmed = true;
      resolveConfirmation?.();
    },
    wait(timeoutMs) {
      if (confirmed) return Promise.resolve(true);

      return new Promise<boolean>((resolve) => {
        const timeout = window.setTimeout(() => resolve(false), timeoutMs);
        void confirmation.then(() => {
          window.clearTimeout(timeout);
          resolve(true);
        });
      });
    },
  };
}

function getOrCreateRecoverySignal(key: string) {
  const existing = recoverySignals.get(key);
  if (existing) return existing;

  const signal = createRecoverySignal();
  recoverySignals.set(key, signal);
  return signal;
}

function releaseRecoverySignal(key: string, signal: RecoverySignal) {
  if (recoverySignals.get(key) === signal) recoverySignals.delete(key);
}

function clearRecoveryMarker() {
  try {
    sessionStorage.removeItem(RECOVERY_MARKER);
    return true;
  } catch {
    return false;
  }
}

function readRecoveryMarker() {
  try {
    return { marker: sessionStorage.getItem(RECOVERY_MARKER), failed: false };
  } catch {
    return { marker: null, failed: true };
  }
}

function hasSensitiveRecoveryHash(hash: URLSearchParams) {
  return [
    "access_token",
    "refresh_token",
    "expires_at",
    "expires_in",
    "token_type",
    "type",
  ].some((key) => hash.has(key));
}

async function createBoundRecoveryMarker(
  supabase: ReturnType<typeof createClient>,
): Promise<RecoveryOutcome> {
  let claimsResult: Awaited<ReturnType<typeof supabase.auth.getClaims>>;

  try {
    claimsResult = await supabase.auth.getClaims();
  } catch {
    return "temporarily_unavailable";
  }

  const { data, error } = claimsResult;
  if (error) {
    return classifyAuthFailure(error, true) === "transient_failure"
      ? "temporarily_unavailable"
      : "invalid";
  }

  const sessionId = data?.claims?.session_id;
  if (typeof sessionId !== "string" || !sessionId) return "invalid";

  try {
    const sessionHash = await hashRecoverySession(sessionId);
    sessionStorage.setItem(
      RECOVERY_MARKER,
      JSON.stringify(createRecoveryMarker(sessionHash)),
    );
  } catch {
    return "temporarily_unavailable";
  }

  return "ready";
}

async function verifyBoundRecoveryMarker(
  supabase: ReturnType<typeof createClient>,
  rawMarker: string,
): Promise<RecoveryOutcome> {
  let claimsResult: Awaited<ReturnType<typeof supabase.auth.getClaims>>;

  try {
    claimsResult = await supabase.auth.getClaims();
  } catch {
    return "temporarily_unavailable";
  }

  const { data, error } = claimsResult;
  if (error) {
    return classifyAuthFailure(error, true) === "transient_failure"
      ? "temporarily_unavailable"
      : "invalid";
  }

  const sessionId = data?.claims?.session_id;
  if (typeof sessionId !== "string" || !sessionId) return "invalid";

  try {
    const sessionHash = await hashRecoverySession(sessionId);
    return parseValidRecoveryMarker(rawMarker, sessionHash) ? "ready" : "invalid";
  } catch {
    return "temporarily_unavailable";
  }
}

async function getUserLookupOutcome(
  supabase: ReturnType<typeof createClient>,
): Promise<UserLookupOutcome> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return classifyUserLookupFailure(error);
    }

    return data.user ? "authenticated" : "signed_out";
  } catch (error) {
    return classifyUserLookupFailure(error);
  }
}

function getResetPasswordError(message?: string) {
  const lower = message?.toLowerCase() ?? "";

  if (lower.includes("expired") || lower.includes("invalid")) {
    return "Your reset link may be expired. Request a new password reset link and try again.";
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many reset attempts. Please wait a moment and try again.";
  }

  if (lower.includes("password")) {
    return "Choose a stronger password and try again.";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network connection failed. Check your internet and try again.";
  }

  return "We could not update your password. Please try again.";
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retrying, setRetrying] = useState(false);
  const recoverySignalRef = useRef<RecoverySignal | null>(null);
  const recoveryEventConfirmedRef = useRef(false);
  const retryIntentRef = useRef<RecoveryRetryIntent>("none");
  const retryExchangeRef = useRef<
    (() => Promise<RecoveryExchangeOutcome>) | null
  >(null);
  const retryMarkerBindingRef = useRef<
    (() => Promise<RecoveryOutcome>) | null
  >(null);
  const retryInFlight = useRef(false);

  const loading = recoveryState === "checking" || recoveryState === "updating";

  const clearRecoveryRetry = useCallback(() => {
    retryIntentRef.current = "none";
    retryExchangeRef.current = null;
    retryMarkerBindingRef.current = null;
  }, []);

  const prepareMarkerBindingRetry = useCallback(() => {
    retryIntentRef.current = "retry_marker_binding";
    retryExchangeRef.current = null;
    retryMarkerBindingRef.current = () => createBoundRecoveryMarker(supabase);
  }, [supabase]);

  const applyMarkerOutcome = useCallback((outcome: RecoveryOutcome) => {
    if (outcome === "ready") {
      clearRecoveryRetry();
      setRecoveryState("ready");
      return;
    }

    if (outcome === "temporarily_unavailable") {
      prepareMarkerBindingRetry();
      setRecoveryState("temporarily_unavailable");
      return;
    }

    clearRecoveryRetry();
    clearRecoveryMarker();
    setRecoveryState("invalid");
  }, [clearRecoveryRetry, prepareMarkerBindingRetry]);

  useEffect(() => {
    let cancelled = false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");
    const hasSensitiveHash = hasSensitiveRecoveryHash(hash);
    const initialSignal = code ? getOrCreateRecoverySignal(code) : null;

    recoverySignalRef.current = initialSignal;
    recoveryEventConfirmedRef.current = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!isConfirmedRecoveryAuthEvent(event)) return;
      recoveryEventConfirmedRef.current = true;
      recoverySignalRef.current?.resolve();
    });

    function startRecoveryExchange(recoveryCode: string) {
      const signal = getOrCreateRecoverySignal(recoveryCode);
      recoverySignalRef.current = signal;
      recoveryEventConfirmedRef.current = false;

      const attempt = getOrCreateKeyedRecoveryAttempt(
        recoveryExchangeAttempts,
        recoveryCode,
        async (): Promise<RecoveryExchangeOutcome> => {
          try {
            const { error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(recoveryCode);
            if (exchangeError) {
              return classifyAuthFailure(exchangeError, true) ===
                "transient_failure"
                ? "temporarily_unavailable"
                : "invalid";
            }

            return (await signal.wait(RECOVERY_EVENT_WAIT_MS))
              ? "confirmed_recovery"
              : "non_recovery";
          } catch (exchangeError) {
            return classifyAuthFailure(exchangeError, true) ===
              "transient_failure"
              ? "temporarily_unavailable"
              : "invalid";
          }
        },
      );

      const release = () => releaseRecoverySignal(recoveryCode, signal);
      void attempt.then(release, release);
      return attempt;
    }

    async function finishNonRecoveryCode() {
      clearRecoveryRetry();
      clearRecoveryMarker();
      const userOutcome = await getUserLookupOutcome(supabase);
      if (cancelled) return;

      if (userOutcome === "authenticated") {
        router.replace("/dashboard");
      } else if (userOutcome === "temporarily_unavailable") {
        setRecoveryState("temporarily_unavailable");
      } else {
        setRecoveryState("invalid");
      }
    }

    async function bindConfirmedRecovery() {
      prepareMarkerBindingRetry();
      const markerOutcome = await createBoundRecoveryMarker(supabase);
      if (cancelled) return;
      applyMarkerOutcome(markerOutcome);
    }

    async function guardResetRoute() {
      const recoveryLinkFailure = classifyRecoveryLinkError({
        error: search.get("error") ?? hash.get("error"),
        errorCode: search.get("error_code") ?? hash.get("error_code"),
        errorDescription:
          search.get("error_description") ?? hash.get("error_description"),
      });

      if (recoveryLinkFailure) {
        clearRecoveryRetry();
        clearRecoveryMarker();
        if (code && initialSignal) {
          releaseRecoverySignal(code, initialSignal);
          recoverySignalRef.current = null;
        }
        removeRecoveryParameters();
        if (!cancelled) setRecoveryState(recoveryLinkFailure);
        return;
      }

      if (code) {
        retryIntentRef.current = "retry_exchange";
        retryExchangeRef.current = () => startRecoveryExchange(code);
        retryMarkerBindingRef.current = null;
        let outcome: RecoveryExchangeOutcome;
        try {
          outcome = await startRecoveryExchange(code);
        } finally {
          removeRecoveryParameters();
        }
        if (cancelled) return;

        if (outcome === "confirmed_recovery") {
          await bindConfirmedRecovery();
          return;
        }

        if (outcome === "temporarily_unavailable") {
          setRecoveryState("temporarily_unavailable");
          return;
        }

        if (outcome === "non_recovery") {
          await finishNonRecoveryCode();
          return;
        }

        clearRecoveryRetry();
        clearRecoveryMarker();
        setRecoveryState("invalid");
        return;
      }

      if (hasSensitiveHash) {
        clearRecoveryRetry();
        clearRecoveryMarker();
        removeRecoveryParameters();
        if (!cancelled) setRecoveryState("invalid");
        return;
      }

      const markerResult = readRecoveryMarker();
      if (markerResult.failed) {
        clearRecoveryRetry();
        setRecoveryState("temporarily_unavailable");
        return;
      }

      if (markerResult.marker) {
        const outcome = await verifyBoundRecoveryMarker(
          supabase,
          markerResult.marker,
        );
        if (cancelled) return;
        applyMarkerOutcome(outcome);
        return;
      }

      const userOutcome = await getUserLookupOutcome(supabase);
      if (cancelled) return;

      if (userOutcome === "authenticated") {
        router.replace("/dashboard");
      } else if (userOutcome === "temporarily_unavailable") {
        setRecoveryState("temporarily_unavailable");
      } else {
        router.replace("/login");
      }
    }

    void guardResetRoute();
    return () => {
      cancelled = true;
      subscription.unsubscribe();
      recoverySignalRef.current = null;
      clearRecoveryRetry();
      if (
        code &&
        initialSignal &&
        !recoveryExchangeAttempts.has(code)
      ) {
        releaseRecoverySignal(code, initialSignal);
      }
    };
  }, [
    applyMarkerOutcome,
    clearRecoveryRetry,
    prepareMarkerBindingRetry,
    router,
    supabase,
  ]);

  async function retryRecoveryCheck() {
    if (retryInFlight.current) return;

    const operation = getRecoveryRetryOperation(retryIntentRef.current);
    if (!operation) {
      window.location.reload();
      return;
    }

    retryInFlight.current = true;
    setRetrying(true);
    setRecoveryState("checking");

    try {
      if (operation === "exchange") {
        const retryExchange = retryExchangeRef.current;
        if (!retryExchange) {
          clearRecoveryRetry();
          setRecoveryState("invalid");
          return;
        }

        const exchangeOutcome = await retryExchange();
        if (exchangeOutcome === "confirmed_recovery") {
          prepareMarkerBindingRetry();
          const markerOutcome = await createBoundRecoveryMarker(supabase);
          applyMarkerOutcome(markerOutcome);
        } else if (exchangeOutcome === "temporarily_unavailable") {
          setRecoveryState("temporarily_unavailable");
        } else if (exchangeOutcome === "non_recovery") {
          clearRecoveryRetry();
          clearRecoveryMarker();
          const userOutcome = await getUserLookupOutcome(supabase);
          if (userOutcome === "authenticated") {
            router.replace("/dashboard");
          } else if (userOutcome === "temporarily_unavailable") {
            setRecoveryState("temporarily_unavailable");
          } else {
            setRecoveryState("invalid");
          }
        } else {
          clearRecoveryRetry();
          clearRecoveryMarker();
          setRecoveryState("invalid");
        }
        return;
      }

      const retryMarkerBinding = retryMarkerBindingRef.current;
      if (!retryMarkerBinding) {
        clearRecoveryRetry();
        setRecoveryState("invalid");
        return;
      }

      applyMarkerOutcome(await retryMarkerBinding());
    } catch {
      setRecoveryState("temporarily_unavailable");
    } finally {
      retryInFlight.current = false;
      setRetrying(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (recoveryState !== "ready") return;

    setRecoveryState("updating");
    setError("");
    setMessage("");

    let updateOutcome: PasswordUpdateOutcome = "thrown_error";
    let updateError: Awaited<
      ReturnType<typeof supabase.auth.updateUser>
    >["error"] = null;

    try {
      const result = await supabase.auth.updateUser({ password });
      updateError = result.error;
      updateOutcome = updateError ? "returned_error" : "success";
    } catch (updateException) {
      setRecoveryState("ready");
      setError(getPasswordUpdateExceptionMessage(updateException));
      return;
    }

    if (updateError) {
      setRecoveryState("ready");
      setError(getResetPasswordError(updateError.message));
      return;
    }

    setPassword("");
    setConfirm("");
    if (shouldClearRecoveryMarkerAfterPasswordUpdate(updateOutcome)) {
      clearRecoveryMarker();
    }
    setRecoveryState("success");
    setMessage("Password updated. Redirecting to your dashboard...");
    setTimeout(() => router.push("/dashboard"), 900);
  }

  return (
    <main className="jf-auth-page jf-login-polish relative grid min-h-dvh place-items-center overflow-hidden px-4 py-8 text-[var(--jf-auth-text)]">
      <div className="jf-auth-grid pointer-events-none absolute inset-0" />
      <div className="jf-auth-accent-line pointer-events-none absolute inset-x-0 top-0 h-1" />

      <motion.section
        initial={{ opacity: 0, y: 12, scale: 0.992 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="jf-auth-icon mb-5 h-14 w-14 rounded-[22px]">
            <LockKeyhole size={24} />
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--jf-auth-text)]">
            Set new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--jf-auth-muted)]">
            Choose a new password for Jamal's Finance.
          </p>
        </div>

        <div className="jf-auth-card relative overflow-hidden p-5 sm:p-6">
          <div className="jf-auth-icon relative z-10 mb-5">
            <LockKeyhole size={20} />
          </div>

          {recoveryState === "checking" ? (
            <p aria-live="polite" className="jf-auth-feedback" data-tone="info">
              Verifying your recovery link...
            </p>
          ) : null}

          {recoveryState === "invalid" ? (
            <div className="relative z-10 mt-5 space-y-4">
              <p role="alert" className="jf-auth-feedback" data-tone="error">
                This password reset link is invalid or has expired. Request a new link to continue.
              </p>
              <button type="button" onClick={() => router.replace("/login")} className="jf-auth-action jf-auth-primary">
                Back to login <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {recoveryState === "temporarily_unavailable" ? (
            <div className="relative z-10 mt-5 space-y-4">
              <p role="alert" className="jf-auth-feedback" data-tone="error">
                We could not verify this link because authentication is temporarily unavailable.
              </p>
              <button
                type="button"
                onClick={retryRecoveryCheck}
                disabled={retrying}
                aria-busy={retrying}
                className="jf-auth-action jf-auth-primary"
              >
                Try again <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {recoveryState === "ready" || recoveryState === "updating" || recoveryState === "success" ? (
          <form
            onSubmit={handleReset}
            className="relative z-10 mt-5 space-y-4"
            aria-busy={loading}
          >
            <div>
              <label
                htmlFor="new-password"
                className="jf-auth-label"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  disabled={loading}
                  className="jf-auth-input jf-auth-input-with-end"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={loading}
                  className="jf-auth-password-toggle absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-[var(--jf-auth-subtle)] transition-colors hover:bg-[var(--jf-auth-panel-hover)] hover:text-[var(--jf-auth-text)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-active/30"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="jf-auth-label"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                disabled={loading}
                className="jf-auth-input"
              />
            </div>

            {message && (
              <p
                aria-live="polite"
                data-tone="success"
                className="jf-auth-feedback"
              >
                {message}
              </p>
            )}
            {error && (
              <p
                role="alert"
                data-tone="error"
                className="jf-auth-feedback"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="jf-auth-action jf-auth-primary"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loading ? "Updating..." : "Update Password"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </button>

            <div className="flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[var(--jf-auth-subtle)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#86efac]" />
              <span>Protected by Supabase Auth and secure sessions.</span>
            </div>
          </form>
          ) : null}
        </div>
      </motion.section>
    </main>
  );
}
