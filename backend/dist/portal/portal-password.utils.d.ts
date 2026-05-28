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
export declare const DEFAULT_PASSWORD_POLICY: PasswordPolicy;
export declare function validatePassword(password: string, policy: PasswordPolicy): PasswordValidationResult;
export declare function settingsToPolicy(settings: any): PasswordPolicy;
