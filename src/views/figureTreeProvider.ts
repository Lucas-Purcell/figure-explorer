import * as vscode from "vscode";
import { FigureRecord, NotebookFigures } from "../notebook/types";
import { figureRegistry } from "../registry/figureRegistry";

type ExplorerItem = NotebookTreeItem | FigureTreeItem;

export class FigureTreeProvider implements vscode.TreeDataProvider<ExplorerItem> {
    private readonly changeEmitter = new vscode.EventEmitter<ExplorerItem | undefined>();
    readonly onDidChangeTreeData = this.changeEmitter.event;

    refresh(): void {
        this.changeEmitter.fire(undefined);
    }

    getTreeItem(element: ExplorerItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ExplorerItem): vscode.ProviderResult<ExplorerItem[]> {
        console.log(
            "FIGURE TREE getChildren",
            element ? element.constructor.name : "ROOT"
        );

        if (!element) {
            const notebooks = figureRegistry.getNotebooks();

            console.log(
                "FIGURE TREE ROOT",
                notebooks.map((notebook) => ({
                    name: notebook.name,
                    figures: notebook.figures.length,
                }))
            );

            return notebooks.map(
                (notebook) => new NotebookTreeItem(notebook)
            );
        }

        if (element instanceof NotebookTreeItem) {
            console.log(
                "FIGURE TREE NOTEBOOK",
                element.notebook.name,
                element.notebook.figures.length
            );

            return element.notebook.figures.map(
                (figure, index) => new FigureTreeItem(figure, index + 1)
            );
        }

        return [];
    }
}

export class NotebookTreeItem extends vscode.TreeItem {
    constructor(readonly notebook: NotebookFigures) {
        super(
            notebook.name,
            notebook.figures.length > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
        );
        this.description = `${notebook.figures.length} figure${notebook.figures.length === 1 ? "" : "s"}`;
        this.tooltip = notebook.uri.fsPath || notebook.uri.toString();
        this.iconPath = new vscode.ThemeIcon("notebook");
        this.command = {
            command: "figure-explorer.openNotebookGallery",
            title: "Open Figure Gallery",
            arguments: [notebook],
        };
    }
}

export class FigureTreeItem extends vscode.TreeItem {
    constructor(readonly figure: FigureRecord, number: number) {
        super(figure.title ?? `Figure ${number}`, vscode.TreeItemCollapsibleState.None);
        const defaultTitle = `Figure ${number}`;
        this.description = figure.title
            ? `${defaultTitle} · Cell ${figure.cellIndex + 1}`
            : `Cell ${figure.cellIndex + 1}`;
        this.tooltip = `${figure.notebookName} — Cell ${figure.cellIndex + 1}\n${figure.codeSnippet}`;
        this.iconPath = new vscode.ThemeIcon("graph-line");
        this.command = {
            command: "figure-explorer.openFigureGallery",
            title: "Open Figure in Gallery",
            arguments: [figure],
        };
        this.contextValue = "figureExplorer.figure";
    }
}