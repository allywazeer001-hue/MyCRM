export interface PasswordPolicy {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minPasswordLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
};

export function validatePassword(password: string, policy: PasswordPolicy): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < policy.minPasswordLength) {
    errors.push(`Minimum ${policy.minPasswordLength} characters required`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }
  if (policy.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Must contain at least one number');
  }
  if (policy.requireSpecial && !/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

export function settingsToPolicy(settings: any): PasswordPolicy {
  return {
    minPasswordLength: settings?.minPasswordLength ?? DEFAULT_PASSWORD_POLICY.minPasswordLength,
    requireUppercase: settings?.requireUppercase ?? DEFAULT_PASSWORD_POLICY.requireUppercase,
    requireLowercase: settings?.requireLowercase ?? DEFAULT_PASSWORD_POLICY.requireLowercase,
    requireNumber: settings?.requireNumber ?? DEFAULT_PASSWORD_POLICY.requireNumber,
    requireSpecial: settings?.requireSpecial ?? DEFAULT_PASSWORD_POLICY.requireSpecial,
  };
}
