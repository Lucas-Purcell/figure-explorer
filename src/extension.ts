import * as vscode from "vscode";
import { scanNotebookCommand } from "./commands/scanNotebook";
import { FigureRecord, NotebookFigures } from "./notebook/types";
import { scanNotebookDocument } from "./notebook/scanner";
import { figureRegistry } from "./registry/figureRegistry";
import { FigureGalleryViewProvider } from "./views/gallery/figureGalleryView";
import { FigureTreeProvider } from "./views/figureTreeProvider";
import {
    exportFigureAsPdf,
    saveFigureAsPng,
} from "./commands/figureActions";
import { FigureTreeItem } from "./views/figureTreeProvider";

const refreshDelayMs = 150;

function log(message: string, ...values: unknown[]): void {
    const suffix = values.length
        ? " " + values.map(formatLogValue).join(" ")
        : "";

    console.debug(
        `[Figure Explorer] ${message}${suffix}`
    );
}

function formatLogValue(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}
export function activate(context: vscode.ExtensionContext): void {

    log("========================================");
    log("FIGURE EXPLORER ACTIVATED");
    log("Extension path:", context.extensionPath);
    log("VS Code version:", vscode.version);
    log("========================================");


    const provider = new FigureTreeProvider();
    const gallery = new FigureGalleryViewProvider((figure: FigureRecord) => {
        void revealNotebookCell(figure, gallery.getEditorColumn());
    });

    const treeView = vscode.window.createTreeView("figureExplorer.figures", {
        treeDataProvider: provider,
        showCollapseAll: true,
    });
    const pendingRefreshes = new Map<string, ReturnType<typeof setTimeout>>();

    const isJupyterNotebook = (document: vscode.NotebookDocument): boolean =>
        document.uri.path.toLowerCase().endsWith(".ipynb");

    const isNotebookTabOpen = (uri: vscode.Uri): boolean => {
        return vscode.window.tabGroups.all.some((group) =>
            group.tabs.some((tab) => {
                const input = tab.input;

                return (
                    input instanceof vscode.TabInputNotebook &&
                    input.uri.toString() === uri.toString()
                );
            })
        );
    };

    const updateNotebook = async (
        document: vscode.NotebookDocument
    ): Promise<void> => {
        if (!isJupyterNotebook(document)) {
            return;
        }

        log(
            "UPDATE NOTEBOOK",
            document.uri.toString()
        );

        log("ABOUT TO SCAN");

        let figures: FigureRecord[];

        try {
            figures = await scanNotebookDocument(document);
        } catch (error) {
            log("SCAN FAILED", error);
            return;
        }

        log(
            "SCANNED FIGURES",
            figures.map((figure) => ({
                cell: figure.cellIndex,
                title: figure.title,
                tags: figure.tags,
                id: figure.id,
            }))
        );

        const isStillOpen = vscode.workspace.notebookDocuments.some(
            (notebook) => notebook.uri.toString() === document.uri.toString()
        );

        if (!isStillOpen) {
            return;
        }

        figureRegistry.setNotebook(document.uri, figures);
        provider.refresh();

        const notebook = figureRegistry.getNotebook(document.uri);

        if (notebook) {
            gallery.refreshIfShowing(notebook);
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

    for (const notebook of vscode.workspace.notebookDocuments) {
        if (isJupyterNotebook(notebook)) {
            void updateNotebook(notebook);
        }
    }

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
            "figure-explorer.revealFigureCell",
            (item: FigureTreeItem) => {
                if (!item?.figure) {
                    vscode.window.showWarningMessage(
                        "No figure was selected."
                    );
                    return;
                }

                void revealNotebookCell(
                    item.figure,
                    gallery.getEditorColumn()
                );
            }
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
            "figure-explorer.openGalleryInEditor",
            () => {
                gallery.openInEditor();
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
        vscode.workspace.onDidOpenNotebookDocument((document) => {
            log(
                "NOTEBOOK OPENED",
                document.uri.toString()
            );

            if (isJupyterNotebook(document)) {
                log("OPENED NOTEBOOK IS JUPYTER");
                void updateNotebook(document);
            } else {
                log("OPENED NOTEBOOK IS NOT JUPYTER");
            }
        }),
        vscode.workspace.onDidChangeNotebookDocument(
            (event: vscode.NotebookDocumentChangeEvent) => {
                log(
                    "NOTEBOOK CHANGED",
                    event.notebook.uri.toString()
                );

                scheduleUpdate(event.notebook);
            }
        ),
        vscode.workspace.onDidCloseNotebookDocument((document) => {
            log(
                "NOTEBOOK CLOSED",
                document.uri.toString()
            );

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
            gallery.refreshRegistry();

            log("REMOVED NOTEBOOK FROM REGISTRY");
        }),

        vscode.window.tabGroups.onDidChangeTabs(() => {
            log("TABS CHANGED");

            for (const notebook of figureRegistry.getNotebooks()) {
                if (!isNotebookTabOpen(notebook.uri)) {
                    log(
                        "REMOVING NOTEBOOK BECAUSE TAB IS CLOSED",
                        notebook.uri.toString()
                    );

                    figureRegistry.removeNotebook(notebook.uri);
                }
            }

            provider.refresh();
            gallery.refreshRegistry();
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

async function revealNotebookCell(
    figure: FigureRecord,
    preferredColumn?: vscode.ViewColumn
): Promise<void> {
    if (!figure?.notebookUri) {
        vscode.window.showWarningMessage(
            "The selected figure does not have a valid notebook reference."
        );
        return;
    }

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

        const existingEditor =
            vscode.window.visibleNotebookEditors.find(
                (editor: vscode.NotebookEditor) =>
                    editor.notebook.uri.toString() ===
                    document.uri.toString()
            );

        const anotherNotebookEditor =
            vscode.window.visibleNotebookEditors[0];

        const notebookColumn =
            existingEditor?.viewColumn ??
            preferredColumn ??
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