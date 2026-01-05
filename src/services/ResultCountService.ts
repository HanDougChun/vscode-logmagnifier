import * as vscode from 'vscode';
import { FilterManager } from './FilterManager';
import { RegexUtils } from '../utils/RegexUtils';

export class ResultCountService {
    private debounceTimer: NodeJS.Timeout | undefined;

    constructor(private filterManager: FilterManager) {
        // Initial calculation
        this.calculateCounts();
    }

    public updateCounts(knownCounts?: Map<string, number>) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        if (knownCounts) {
            // If we have known counts (e.g. from Highlighter), apply immediately without debounce
            this.applyKnownCounts(knownCounts);
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.calculateCounts();
        }, 500); // 500ms debounce
    }

    private applyKnownCounts(knownCounts: Map<string, number>) {
        const groups = this.filterManager.getGroups();
        const filterCounts: { filterId: string, count: number }[] = [];
        const groupCounts: { groupId: string, count: number }[] = [];

        for (const group of groups) {
            let groupMatchCount = 0;
            for (const filter of group.filters) {
                const count = knownCounts.get(filter.id) || 0;
                filterCounts.push({ filterId: filter.id, count });
                groupMatchCount += count;
            }
            groupCounts.push({ groupId: group.id, count: groupMatchCount });
        }

        this.filterManager.updateResultCounts(filterCounts, groupCounts);
    }

    private calculateCounts() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.clearCounts();
            return;
        }

        const text = editor.document.getText();
        const groups = this.filterManager.getGroups();
        const filterCounts: { filterId: string, count: number }[] = [];
        const groupCounts: { groupId: string, count: number }[] = [];

        const enableRegexHighlight = vscode.workspace.getConfiguration('logmagnifier').get<boolean>('enableRegexHighlight') || false;

        for (const group of groups) {
            let groupMatchCount = 0;

            for (const filter of group.filters) {
                let count = 0;
                if (group.isEnabled && filter.isEnabled && filter.keyword && filter.type === 'include') {
                    // Skip regex count if highlighting is disabled for regex
                    if (filter.isRegex && !enableRegexHighlight) {
                        count = 0;
                    } else {
                        try {
                            const regex = RegexUtils.create(filter.keyword, !!filter.isRegex, !!filter.caseSensitive);
                            const matches = text.match(regex);
                            count = matches ? matches.length : 0;
                        } catch (e) {
                            count = 0;
                        }
                    }
                }
                filterCounts.push({ filterId: filter.id, count });
                groupMatchCount += count;
            }
            groupCounts.push({ groupId: group.id, count: groupMatchCount });
        }

        this.filterManager.updateResultCounts(filterCounts, groupCounts);
    }

    public clearCounts() {
        const groups = this.filterManager.getGroups();
        const filterCounts = groups.flatMap(g => g.filters.map(f => ({ filterId: f.id, count: 0 })));
        const groupCounts = groups.map(g => ({ groupId: g.id, count: 0 }));
        this.filterManager.updateResultCounts(filterCounts, groupCounts);
    }
}
