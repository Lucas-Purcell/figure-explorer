import * as vscode from "vscode";
import { scanNotebookCommand } from "./commands/scanNotebook";
import { FigureRecord, NotebookFigures } from "./notebook/types";
import { scanNotebookDocument } from "./notebook/scanner";
import { figureRegistry } from "./registry/figureRegistry";
import { FigureGalleryViewProvider } from "./views/figureGalleryView";
import { FigureTreeProvider } from "./views/figureTreeProvider";
import {
    exportFigureAsPdf,
    saveFigureAsPng,
} from "./commands/figureActions";
import { FigureTreeItem } from "./views/figureTreeProvider";

const refreshDelayMs = 150;

export function activate(context: vscode.ExtensionContext): void {
    const provider = new FigureTreeProvider();
    const gallery = new FigureGalleryViewProvider((figure: FigureRecord) => {
        void revealNotebookCell(figure);
    });

    const treeView = vscode.window.createTreeView("figureExplorer.figures", {
        treeDataProvider: provider,
        showCollapseAll: true,
    });
    const pendingRefreshes = new Map<string, ReturnType<typeof setTimeout>>();

    const isJupyterNotebook = (document: vscode.NotebookDocument): boolean =>
        document.uri.path.toLowerCase().endsWith(".ipynb");

    const updateNotebook = (document: vscode.NotebookDocument): void => {
        if (!isJupyterNotebook(document)) {
            return;
        }

        figureRegistry.setNotebook(document.uri, scanNotebookDocument(document));
        provider.refresh();
        const currentNotebook = figureRegistry.getNotebook(document.uri);
        if (currentNotebook) {
            gallery.refreshIfShowing(currentNotebook);
        }
    };

    const scheduleUpdate = (document: vscode.NotebookDocument): void => {
        if (!isJupyterNotebook(document)) {
            return;
        }

        const key = document.uri.toString();
        const existing = pendingRefreshes.get(key);
        if (existing) {
            clearTimeout(existing);
        }

        pendingRefreshes.set(key, setTimeout(() => {
            pendingRefreshes.delete(key);
            updateNotebook(document);
        }, refreshDelayMs));
    };

    vscode.workspace.notebookDocuments.forEach(updateNotebook);

    context.subscriptions.push(
        treeView,
        gallery,
        vscode.window.registerWebviewViewProvider(
            "figureExplorer.gallery",
            gallery
        ),
        vscode.commands.registerCommand("figure-explorer.scanNotebook", () =>
            scanNotebookCommand(provider)
        ),
        vscode.commands.registerCommand(
            "figure-explorer.openNotebookGallery",
            (notebook: NotebookFigures) => gallery.show(notebook)
        ),
        vscode.commands.registerCommand(
            "figure-explorer.openFigureGallery",
            (figure: FigureRecord) => {
                const notebook = figureRegistry.getNotebook(figure.notebookUri);
                if (notebook) {
                    gallery.show(notebook, figure.id);
                }
            }
        ),
        vscode.commands.registerCommand(
            "figure-explorer.revealFigureCell",
            (item: FigureTreeItem) => {
                void revealNotebookCell(item.figure);
            }
        ),
        vscode.commands.registerCommand(
            "figure-explorer.saveFigureAsPng",
            (item: FigureTreeItem) => {
                void saveFigureAsPng(item.figure);
            }
        ),
        vscode.commands.registerCommand(
            "figure-explorer.exportFigureAsPdf",
            (item: FigureTreeItem) => {
                void exportFigureAsPdf(item.figure);
            }
        ),
        vscode.workspace.onDidOpenNotebookDocument(updateNotebook),
        vscode.workspace.onDidChangeNotebookDocument((event: vscode.NotebookDocumentChangeEvent) =>
            scheduleUpdate(event.notebook)
        ),
        vscode.workspace.onDidCloseNotebookDocument((document: vscode.NotebookDocument) => {
            if (!isJupyterNotebook(document)) {
                return;
            }

            const key = document.uri.toString();
            const pending = pendingRefreshes.get(key);
            if (pending) {
                clearTimeout(pending);
                pendingRefreshes.delete(key);
            }

            figureRegistry.removeNotebook(document.uri);
            provider.refresh();
        }),
        {
            dispose: () => {
                pendingRefreshes.forEach((timer: ReturnType<typeof setTimeout>) =>
                    clearTimeout(timer)
                );
            },
        }
    );
}

async function revealNotebookCell(figure: FigureRecord): Promise<void> {
    try {
        const document = vscode.workspace.notebookDocuments.find(
            (notebook: vscode.NotebookDocument) =>
                notebook.uri.toString() === figure.notebookUri.toString()
        ) ?? await vscode.workspace.openNotebookDocument(figure.notebookUri);

        if (figure.cellIndex >= document.cellCount) {
            vscode.window.showWarningMessage(
                "That figure's source cell is no longer in the notebook."
            );
            return;
        }

        const existingEditor = vscode.window.visibleNotebookEditors.find(
            (editor: vscode.NotebookEditor) =>
                editor.notebook.uri.toString() === document.uri.toString()
        );
        const anotherNotebookEditor = vscode.window.visibleNotebookEditors[0];
        const notebookColumn =
            existingEditor?.viewColumn ??
            anotherNotebookEditor?.viewColumn ??
            vscode.window.activeTextEditor?.viewColumn ??
            vscode.ViewColumn.One;

        const editor = await vscode.window.showNotebookDocument(document, {
            viewColumn: notebookColumn,
            preserveFocus: false,
        });
        editor.revealRange(
            new vscode.NotebookRange(figure.cellIndex, figure.cellIndex + 1),
            vscode.NotebookEditorRevealType.InCenter
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Could not reveal notebook cell: ${message}`);
    }
}

export function deactivate(): void {}