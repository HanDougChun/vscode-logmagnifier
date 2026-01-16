import * as vscode from 'vscode';
import { LogBookmarkService } from './LogBookmarkService';
import { BookmarkItem } from '../models/Bookmark';
import { FilterItem } from '../models/Filter';
import { HighlightService } from './HighlightService';
import { Constants } from '../constants';
import { RegexUtils } from '../utils/RegexUtils';

export class LogBookmarkCommandManager {
    constructor(
        context: vscode.ExtensionContext,
        private bookmarkService: LogBookmarkService,
        private highlightService: HighlightService
    ) {
        this.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand(Constants.Commands.AddBookmark, () => this.addBookmark()));
        context.subscriptions.push(vscode.commands.registerCommand(Constants.Commands.RemoveBookmark, (item: BookmarkItem) => this.removeBookmark(item)));
        context.subscriptions.push(vscode.commands.registerCommand(Constants.Commands.JumpToBookmark, (item: BookmarkItem) => this.jumpToBookmark(item)));
        context.subscriptions.push(vscode.commands.registerCommand(Constants.Commands.AddMatchListToBookmark, (filter: FilterItem) => this.addMatchListToBookmark(filter)));
    }

    private addBookmark() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const line = editor.selection.active.line;
            this.bookmarkService.addBookmark(editor, line);
        }
    }

    private async addMatchListToBookmark(filter: FilterItem) {
        if (!filter) { return; }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor found.');
            return;
        }

        const keyword = filter.keyword;
        if (!keyword) { return; }

        // Use RegexUtils to create regex for searching
        const regex = RegexUtils.create(keyword, !!filter.isRegex, !!filter.caseSensitive);
        const text = editor.document.getText();
        const lines = text.split(/\r?\n/);

        let count = 0;

        // Iterate line by line to match
        for (let i = 0; i < lines.length; i++) {
            const lineContent = lines[i];

            // Reset lastIndex as RegexUtils returns a shared RegExp instance with global flag
            regex.lastIndex = 0;

            if (regex.test(lineContent)) {
                this.bookmarkService.addBookmark(editor, i);
                count++;
            }
        }

        if (count > 0) {
            vscode.window.showInformationMessage(`Added ${count} bookmarks.`);
        } else {
            vscode.window.showInformationMessage('No matches found in the active editor.');
        }
    }

    private removeBookmark(item: BookmarkItem) {
        if (item) {
            this.bookmarkService.removeBookmark(item);
        }
    }

    private async jumpToBookmark(item: BookmarkItem) {
        if (!item) { return; }
        try {
            const doc = await vscode.workspace.openTextDocument(item.uri);
            const editor = await vscode.window.showTextDocument(doc, { preview: true });
            const range = new vscode.Range(item.line, 0, item.line, 0);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            editor.selection = new vscode.Selection(range.start, range.start);
            this.highlightService.flashLine(editor, item.line, Constants.Configuration.Bookmark.HighlightColor);
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to open bookmark: ${e}`);
        }
    }
}
