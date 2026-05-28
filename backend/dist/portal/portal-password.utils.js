"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PASSWORD_POLICY = void 0;
exports.validatePassword = validatePassword;
exports.settingsToPolicy = settingsToPolicy;
exports.DEFAULT_PASSWORD_POLICY = {
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false,
};
function validatePassword(password, policy) {
    const errors = [];
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
function settingsToPolicy(settings) {
    return {
        minPasswordLength: settings?.minPasswordLength ?? exports.DEFAULT_PASSWORD_POLICY.minPasswordLength,
        requireUppercase: settings?.requireUppercase ?? exports.DEFAULT_PASSWORD_POLICY.requireUppercase,
        requireLowercase: settings?.requireLowercase ?? exports.DEFAULT_PASSWORD_POLICY.requireLowercase,
        requireNumber: settings?.requireNumber ?? exports.DEFAULT_PASSWORD_POLICY.requireNumber,
        requireSpecial: settings?.requireSpecial ?? exports.DEFAULT_PASSWORD_POLICY.requireSpecial,
    };
}
//# sourceMappingURL=portal-password.utils.js.map