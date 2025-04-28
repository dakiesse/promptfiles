import * as vscode from 'vscode';
import * as path from 'node:path';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('promptfiles.copyContent', async (uri, uris: vscode.Uri[]) => {
		try {
			const targets = uris && uris.length > 0 ? uris : [uri];

			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('No workspace folder open.');
				return;
			}

			const results: string[] = [];
			let fileCount = 0;

			for (const targetUri of targets) {
				fileCount += await collectFilesContent(targetUri, workspaceFolder.uri.fsPath, results);
			}

			const finalText = results.join('\n\n');

			await vscode.env.clipboard.writeText(finalText);

			vscode.window.showInformationMessage(`Copied content of ${fileCount} file(s) to clipboard.`);
		} catch (err) {
			vscode.window.showErrorMessage(`Error copying content: ${(err as Error).message}`);
		}
	});

	context.subscriptions.push(disposable);
}

async function collectFilesContent(uri: vscode.Uri, workspaceRoot: string, results: string[]): Promise<number> {
	const stat = await vscode.workspace.fs.stat(uri);
	let count = 0;

	if (stat.type === vscode.FileType.File) {
		const contentBytes = await vscode.workspace.fs.readFile(uri);
		const content = Buffer.from(contentBytes).toString('utf8');

		const relativePath = path.relative(workspaceRoot, uri.fsPath).replace(/\\/g, '/');

		results.push(`<file path="${relativePath}">\n${content.trim()}\n</file>`);
		count = 1;
	} else if (stat.type === vscode.FileType.Directory) {
		const entries = await vscode.workspace.fs.readDirectory(uri);

		for (const [name, fileType] of entries) {
			const childUri = vscode.Uri.joinPath(uri, name);
			count += await collectFilesContent(childUri, workspaceRoot, results);
		}
	}

	return count;
}

export function deactivate() { }