import * as vscode from "vscode";
import { FigureRecord, NotebookFigures } from "../../notebook/types";
import { figureRegistry } from "../../registry/figureRegistry";
import { imageStore } from "../../registry/imageStore";
import { galleryShellHtml } from "./galleryHtml";
import {
    saveFigureAsPng,
    exportFigureAsPdf,
    saveFiguresAsPng,
    exportFiguresAsPdf
} from "../../commands/figureActions";

type SearchScope = "notebook" | "all";

type GalleryMessage =
    | { type: "selectFigure"; key: string }
    | { type: "setScope"; scope: SearchScope }
    | { type: "revealCell" }
    | { type: "requestThumbnail"; key: string }
    | { type: "requestPreview"; key: string }
    | { type: "exportPdf"; key: string }
    | { type: "savePNG"; key: string }
    | { type: "copyImage"; key: string }
    | { type: "exportAllPng"; keys: string[] }
    | { type: "exportAllPdf"; keys: string[] };

interface FigurePayload {
    key: string;
    notebookName: string;
    number: number;
    title?: string;
    tags: string[];
    cellIndex: number;
    mimeType: string;
    codeSnippet: string;
    cellSource: string;
    searchText: string;
    version: string;
}

export class FigureGalleryViewProvider
    implements vscode.WebviewViewProvider, vscode.Disposable {
    private view: vscode.WebviewView | undefined;
    private panel: vscode.WebviewPanel | undefined;
    private notebook: NotebookFigures | undefined;
    private selectedKey: string | undefined;
    private scope: SearchScope = "notebook";
    private readonly disposables: vscode.Disposable[] = [];
    private findFigureByKey(key: string) {
        return this.currentFigures.find(
            ({ notebook, figure }) =>
                figureKey(notebook, figure.id) === key
        );
    }

    private sendImage(
        key: string,
        type: "thumbnail" | "preview"
    ): void {

        if (!this.view && !this.panel) {
            return;
        }

        const match = this.findFigureByKey(key);

        if (!match) {
            return;
        }

        const base64 = imageStore.getBase64(match.figure.id);

        if (!base64) {
            return;
        }

        const message = {
            type,
            key,
            mimeType: match.figure.mimeType,
            data: base64,
            version: figureVersion(match.figure),
        };

        if (this.view) {
            void this.view.webview.postMessage(message);
        }

        if (this.panel) {
            void this.panel.webview.postMessage(message);
        }
    }

    private sendThumbnail(key: string): void {
        this.sendImage(key, "thumbnail");
    }

    private sendPreview(key: string): void {
        this.sendImage(key, "preview");
    }

    constructor(private readonly revealCell: (figure: FigureRecord) => void) {}

    getEditorViewColumn(): vscode.ViewColumn | undefined {
        return this.panel?.viewColumn;
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = galleryShellHtml();

        webviewView.webview.onDidReceiveMessage(
            (message: GalleryMessage) => this.handleMessage(message),
            undefined,
            this.disposables
        );

        webviewView.onDidDispose(() => {
            this.view = undefined;
        }, undefined, this.disposables);

        this.sendCatalog();
    }

    getEditorColumn(): vscode.ViewColumn | undefined {
        return this.panel?.viewColumn;
    }

    openInEditor(): void {
        if (this.panel) {
            this.panel.reveal();
            this.sendCatalog();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            "figureExplorer.galleryPanel",
            "Figure Gallery",
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        this.panel.webview.html = galleryShellHtml(true);

        this.panel.webview.onDidReceiveMessage(
            (message: GalleryMessage) => this.handleMessage(message),
            undefined,
            this.disposables
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, undefined, this.disposables);

        this.sendCatalog();
    }

    show(notebook: NotebookFigures, selectedFigureId?: string): void {
        this.notebook = notebook;
        this.rebuildFigureList();

        if (selectedFigureId) {
            this.selectedKey = figureKey(notebook, selectedFigureId);
        }

        this.ensureSelection();

        if (this.panel) {
            this.panel.reveal();
        } else {
            this.view?.show(false);
        }

        this.sendCatalog();
    }
    refresh(): void {
        if (
            this.notebook &&
            !figureRegistry.getNotebook(this.notebook.uri)
        ) {
            this.notebook = undefined;
            this.selectedKey = undefined;
        }

        this.rebuildFigureList();
        this.ensureSelection();
        this.sendCatalog();
    }

    refreshIfShowing(notebook: NotebookFigures): void {

        const isCurrentNotebook =
            this.notebook?.uri.toString() === notebook.uri.toString();

        if (isCurrentNotebook) {
            this.notebook = notebook;
        }

        if (this.scope === "all" || isCurrentNotebook) {
            this.rebuildFigureList();
            this.ensureSelection();
            this.sendCatalog();
        }
    }

    refreshAll(): void {

        if (this.scope === "notebook") {
            if (
                this.notebook &&
                !figureRegistry.getNotebook(this.notebook.uri)
            ) {
                this.notebook = undefined;
            }
        }

        if (!this.view) {
            return;
        }

        this.rebuildFigureList();
        this.ensureSelection();
        this.sendCatalog();
    }

    refreshRegistry(): void {
        if (this.notebook) {
            const updated =
                figureRegistry.getNotebook(this.notebook.uri);

            if (updated) {
                this.notebook = updated;
            } else {
                this.notebook = undefined;
                this.selectedKey = undefined;
            }
        }

        this.rebuildFigureList();
        this.ensureSelection();
        this.sendCatalog();
    }

    dispose(): void {
        this.disposables.forEach((disposable) => disposable.dispose());
    }

    private async handleMessage(message: GalleryMessage): Promise<void> {

        switch (message.type) {

            case "selectFigure":
                this.selectedKey = message.key;
                break;

            case "setScope":
                this.scope = message.scope;
                this.rebuildFigureList();
                this.ensureSelection();
                this.sendCatalog();
                break;

            case "requestThumbnail":
                this.sendThumbnail(message.key);
                break;

            case "requestPreview":
                this.sendPreview(message.key);
                break;

            case "revealCell": {
                const figure = this.findSelectedFigure();

                if (figure) {
                    this.revealCell(figure);
                }

                break;
            }
            case "savePNG": {
                const match = this.findFigureByKey(message.key);

                if (match) {
                    await saveFigureAsPng(match.figure);
                }


                break;
            }

            case "exportPdf": {
                const match = this.findFigureByKey(message.key);

                if (match) {
                    await exportFigureAsPdf(match.figure);
                }

                break;
            }
            case "exportAllPng": {
                const figures =
                    message.keys
                        .map((key) => this.findFigureByKey(key)?.figure)
                        .filter(
                            (figure): figure is FigureRecord =>
                                figure !== undefined
                        );

                await saveFiguresAsPng(figures);

                break;
            }

            case "exportAllPdf": {
                const figures =
                    message.keys
                        .map((key) => this.findFigureByKey(key)?.figure)
                        .filter(
                            (figure): figure is FigureRecord =>
                                figure !== undefined
                        );

                await exportFiguresAsPdf(figures);

                break;
            }

        }
    }
    private currentFigures: Array<{
        notebook: NotebookFigures;
        figure: FigureRecord;
        number: number;
    }> = [];
    private rebuildFigureList(): void {
        const notebooks =
            this.scope === "all"
                ? figureRegistry.getNotebooks()
                : this.notebook
                    ? [this.notebook]
                    : [];

        this.currentFigures =
            notebooks.flatMap((notebook) =>
                notebook.figures.map((figure, index) => ({
                    notebook,
                    figure,
                    number: index + 1,
                }))
            );
    }

    private ensureSelection(): void {
        const figures = this.currentFigures;

        if (!figures.some(({ notebook, figure }) =>
            figureKey(notebook, figure.id) === this.selectedKey
        )) {
            const first = figures[0];
            this.selectedKey = first
                ? figureKey(first.notebook, first.figure.id)
                : undefined;
        }
    }

    private findSelectedFigure(): FigureRecord | undefined {
        return this.currentFigures.find(({ notebook, figure }) =>
            figureKey(notebook, figure.id) === this.selectedKey
        )?.figure;
    }

    private sendCatalog(): void {
        if (!this.view && !this.panel) {
            return;
        }

        const figures = this.currentFigures;
        const payload: FigurePayload[] = figures.map(
            ({ notebook, figure, number }) => ({
                key: figureKey(notebook, figure.id),
                notebookName: notebook.name,
                number,
                title: figure.title,
                tags: figure.tags,
                cellIndex: figure.cellIndex,
                mimeType: figure.mimeType,
                codeSnippet: figure.codeSnippet,
                cellSource: figure.cellSource,
                searchText: figure.searchText,
                version: figureVersion(figure),
            })
        );

        const message = {
            type: "setCatalog",
            scope: this.scope,
            selectedKey: this.selectedKey,
            notebookName: this.notebook?.name ?? "",
            totalFigures: payload.length,
            figures: payload,
        };

        if (this.view) {
            void this.view.webview.postMessage(message);
        }

        if (this.panel) {
            void this.panel.webview.postMessage(message);
        }
    }
}

function figureKey(notebook: NotebookFigures, figureId: string): string {
    return `${notebook.uri.toString()}::${figureId}`;
}

function figureVersion(
    figure: FigureRecord
): string {
    return figure.version;
}