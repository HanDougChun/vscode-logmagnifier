import * as vscode from 'vscode';
import * as fs from 'fs';
import { FilterManager } from './services/FilterManager';
import { FilterTreeDataProvider } from './views/FilterTreeView';
import { LogProcessor } from './services/LogProcessor';
import { HighlightService } from './services/HighlightService';
import { ResultCountService } from './services/ResultCountService';
import { Logger } from './services/Logger';
import { CommandManager } from './services/CommandManager';

export function activate(context: vscode.ExtensionContext) {
	const filterManager = new FilterManager();
	const wordTreeDataProvider = new FilterTreeDataProvider(filterManager, 'word');
	const regexTreeDataProvider = new FilterTreeDataProvider(filterManager, 'regex');
	const logProcessor = new LogProcessor();
	const logger = Logger.getInstance();
	logger.info('LogMagnifier activated');

	const highlightService = new HighlightService(filterManager, logger);
	const resultCountService = new ResultCountService(filterManager);

	// Initialize Command Manager (Handles all command registrations)
	new CommandManager(context, filterManager, highlightService, resultCountService, logProcessor, logger);

	vscode.window.createTreeView('logmagnifier-filters', { treeDataProvider: wordTreeDataProvider, dragAndDropController: wordTreeDataProvider });
	vscode.window.createTreeView('logmagnifier-regex-filters', { treeDataProvider: regexTreeDataProvider, dragAndDropController: regexTreeDataProvider });

	// Update highlights and counts when active editor changes
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			if (editor.document.uri.scheme === 'output') {
				return;
			}
			const scheme = editor.document.uri.scheme;
			const fileName = editor.document.fileName;
			const largeFileOptimizations = vscode.workspace.getConfiguration('editor').get<boolean>('largeFileOptimizations');
			logger.info(`Active editor changed to: ${fileName} (Scheme: ${scheme}, LargeFileOptimizations: ${largeFileOptimizations})`);

			const counts = highlightService.updateHighlights(editor);
			resultCountService.updateCounts(counts);
		} else {
			// Fallback for large files where activeTextEditor is undefined
			const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
			if (activeTab && activeTab.input instanceof vscode.TabInputText) {
				const uri = activeTab.input.uri;

				// Standard VS Code limit for extensions is 50MB
				try {
					if (uri.scheme === 'file') {
						const stats = fs.statSync(uri.fsPath);
						const sizeMB = stats.size / (1024 * 1024);
						if (sizeMB > 50) {
							logger.info(`Active editor changed to (Tab): ${uri.fsPath} (${sizeMB.toFixed(2)}MB). - Too large for extension host (Limit 50MB).`);
							vscode.window.setStatusBarMessage(`LogMagnifier: File too large (${sizeMB.toFixed(1)}MB). VS Code limits extension support to 50MB.`, 5000);
							resultCountService.clearCounts();
							return;
						}
					}
				} catch (e) {
					logger.error(`Error checking file size: ${e}`);
				}

				logger.info(`Active editor changed to (Tab): ${uri.fsPath} (Scheme: ${uri.scheme}) - activeTextEditor undefined.`);
			} else {
				logger.info('Active editor changed to: (None)');
			}
		}
	}));

	// Update highlights when filters change
	context.subscriptions.push(filterManager.onDidChangeFilters(() => {
		if (vscode.window.activeTextEditor) {
			const counts = highlightService.updateHighlights(vscode.window.activeTextEditor);
			resultCountService.updateCounts(counts);
		}
	}));

	// Update highlights when configuration changes (e.g. color)
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('logmagnifier.regexHighlightColor') || e.affectsConfiguration('logmagnifier.enableRegexHighlight')) {
			highlightService.refreshDecorationType();
			if (vscode.window.activeTextEditor) {
				const counts = highlightService.updateHighlights(vscode.window.activeTextEditor);
				resultCountService.updateCounts(counts);
			}
		}
	}));

	// Initial highlight
	if (vscode.window.activeTextEditor) {
		const editor = vscode.window.activeTextEditor;
		const scheme = editor.document.uri.scheme;
		const fileName = editor.document.fileName;
		logger.info(`Initial active editor: ${fileName} (Scheme: ${scheme})`);

		const counts = highlightService.updateHighlights(editor);
		resultCountService.updateCounts(counts);
	}

	// Update counts when text changes
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
		if (vscode.window.activeTextEditor && e.document === vscode.window.activeTextEditor.document) {
			resultCountService.updateCounts();
		}
	}));
}

export function deactivate() { }
