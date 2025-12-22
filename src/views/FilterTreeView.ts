import * as vscode from 'vscode';
import { FilterManager } from '../services/FilterManager';
import { FilterGroup, FilterItem } from '../models/Filter';

type TreeItem = FilterGroup | FilterItem;

export class FilterTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor(
        private filterManager: FilterManager,
        private mode: 'word' | 'regex'
    ) {
        this.filterManager.onDidChangeFilters(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        if (this.isGroup(element)) {
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Expanded);
            item.contextValue = element.isEnabled ? 'filterGroupEnabled' : 'filterGroupDisabled';
            item.id = element.id;
            item.iconPath = element.isEnabled ? new vscode.ThemeIcon('pass-filled') : new vscode.ThemeIcon('circle-large-outline');
            item.description = element.isEnabled ? '(Active)' : '(Inactive)';
            return item;
        } else {
            let label = element.keyword;
            let description = element.isEnabled ? '' : '(Disabled)';

            if (element.isRegex) {
                label = element.nickname || element.keyword;
                description = element.keyword + (element.isEnabled ? '' : ' (Disabled)');
            } else {
                label = `${element.type === 'include' ? '[IN]' : '[OUT]'} ${element.keyword}`;
            }

            const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
            item.contextValue = element.isEnabled ? 'filterItemEnabled' : 'filterItemDisabled';
            item.id = element.id;
            item.description = description;

            item.iconPath = element.isEnabled ?
                (element.type === 'include' ? new vscode.ThemeIcon('eye') : new vscode.ThemeIcon('eye-closed')) :
                new vscode.ThemeIcon('circle-slash');
            return item;
        }
    }

    getChildren(element?: TreeItem): vscode.ProviderResult<TreeItem[]> {
        if (!element) {
            // Filter groups based on the data provider's mode
            return this.filterManager.getGroups().filter(g => this.mode === 'regex' ? g.isRegex : !g.isRegex);
        } else if (this.isGroup(element)) {
            // Filter items based on the data provider's mode
            return element.filters.filter(f => this.mode === 'regex' ? f.isRegex : !f.isRegex);
        }
        return [];
    }

    private isGroup(item: any): item is FilterGroup {
        return (item as FilterGroup).filters !== undefined;
    }
}
