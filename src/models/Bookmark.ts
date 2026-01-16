import * as vscode from 'vscode';

export interface BookmarkItem {
    id: string; // Unique ID for the bookmark
    uri: vscode.Uri;
    line: number;
    content: string;
}
