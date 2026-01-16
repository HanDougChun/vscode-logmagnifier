import * as vscode from 'vscode';
import { LogBookmarkService } from '../services/LogBookmarkService';
import { BookmarkItem } from '../models/Bookmark';


export class LogBookmarkProvider implements vscode.TreeDataProvider<BookmarkItem | string> {
    private _onDidChangeTreeData: vscode.EventEmitter<BookmarkItem | string | undefined | null | void> = new vscode.EventEmitter<BookmarkItem | string | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BookmarkItem | string | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private bookmarkService: LogBookmarkService) {
        this.bookmarkService.onDidChangeBookmarks(() => {
            this._onDidChangeTreeData.fire();
        });
    }

    getTreeItem(element: BookmarkItem | string): vscode.TreeItem {
        if (typeof element === 'string') {
            // It's a file URI string
            const uri = vscode.Uri.parse(element);
            const item = new vscode.TreeItem(uri, vscode.TreeItemCollapsibleState.Expanded);
            item.contextValue = 'file';
            return item;
        } else {
            // It's a bookmark item
            const item = new vscode.TreeItem(`Line ${element.line + 1}: ${element.content}`, vscode.TreeItemCollapsibleState.None);
            item.description = '';
            item.tooltip = element.content;
            item.command = {
                command: 'logmagnifier.jumpToBookmark',
                title: 'Jump to Bookmark',
                arguments: [element]
            };
            item.contextValue = 'bookmark';
            // Use codicon for tree item if desired, or relying on default
            item.iconPath = new vscode.ThemeIcon('bookmark');
            return item;
        }
    }

    getChildren(element?: BookmarkItem | string): vscode.ProviderResult<(BookmarkItem | string)[]> {
        const bookmarks = this.bookmarkService.getBookmarks();

        if (!element) {
            // Root: return file URIs
            return Array.from(bookmarks.keys());
        } else if (typeof element === 'string') {
            // File node: return bookmarks for this file
            return bookmarks.get(element) || [];
        }

        return [];
    }
}
