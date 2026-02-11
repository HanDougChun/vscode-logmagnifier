import * as crypto from 'crypto';

export function getNonce(): string {
    return crypto.randomBytes(16).toString('base64');
}

export function escapeHtml(unsafe: string | undefined | null): string {
    if (!unsafe) { return ''; }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
