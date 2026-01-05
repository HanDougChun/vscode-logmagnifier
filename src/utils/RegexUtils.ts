export class RegexUtils {
    /**
     * Creates a RegExp object safely.
     * @param keyword The pattern or search text.
     * @param isRegex Whether the keyword is a regex pattern.
     * @param caseSensitive Whether the search should be case sensitive.
     * @returns A RegExp object. Returns a match-nothing regex on error.
     */
    public static create(keyword: string, isRegex: boolean, caseSensitive: boolean): RegExp {
        try {
            const flags = caseSensitive ? 'g' : 'gi';
            if (isRegex) {
                return new RegExp(keyword, flags);
            } else {
                const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return new RegExp(escaped, flags);
            }
        } catch (e) {
            // Return a regex that matches nothing
            return /(?!)/;
        }
    }
}
