export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_POLICY_MESSAGE =
  `Use ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters with at least one letter and one number or symbol.`;

export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; error: string };

function characterLength(value: string) {
  return Array.from(value).length;
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const length = characterLength(password);

  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
    return { ok: false, error: PASSWORD_POLICY_MESSAGE };
  }

  const hasLetter = /\p{L}/u.test(password);
  const hasNumberOrSymbol = /[\p{N}\p{P}\p{S}]/u.test(password);

  if (!hasLetter || !hasNumberOrSymbol) {
    return { ok: false, error: PASSWORD_POLICY_MESSAGE };
  }

  return { ok: true };
}
