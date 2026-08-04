// import * as vscode from "vscode";
// import { FigureRecord, NotebookFigures } from "../notebook/types";

// type GalleryMessage =
//     | { type: "selectFigure"; key: string }
//     | { type: "setScope"; scope: SearchScope }
//     | { type: "revealCell" }
//     | { type: "requestThumbnail"; key: string };

// export class FigureGalleryPanel implements vscode.Disposable {
//     private panel: vscode.WebviewPanel | undefined;
//     private panelDisposables: vscode.Disposable[] = [];
//     private notebook: NotebookFigures | undefined;
//     private selectedFigureId: string | undefined;

//     constructor(private readonly revealCell: (figure: FigureRecord, viewColumn?: vscode.ViewColumn) => void) {}

//     getViewColumn(): vscode.ViewColumn | undefined {
//         return this.panel?.viewColumn;
//     }

//     show(notebook: NotebookFigures, selectedFigureId?: string): void {
//         this.notebook = notebook;
//         this.selectedFigureId = selectedFigureId ?? this.selectedFigureId;

//         if (!notebook.figures.some((figure: FigureRecord) => figure.id === this.selectedFigureId)) {
//             this.selectedFigureId = notebook.figures[0]?.id;
//         }

//         if (!this.panel) {
//             this.panel = vscode.window.createWebviewPanel(
//                 "figureExplorer.gallery",
//                 "Figure Gallery",
//                 vscode.ViewColumn.Beside,
//                 {
//                     enableScripts: true,
//                     retainContextWhenHidden: true,
//                 }
//             );

//             this.panel.onDidDispose(() => this.disposePanel(), undefined, this.panelDisposables);
//             this.panel.webview.onDidReceiveMessage(
//                 (message: GalleryMessage) => this.handleMessage(message),
//                 undefined,
//                 this.panelDisposables
//             );
//         }

//         this.panel.title = `Figures — ${notebook.name}`;
//         this.panel.reveal(
//             this.panel.viewColumn ?? vscode.ViewColumn.Beside, false);
//         this.render();
//     }

//     refreshIfShowing(notebook: NotebookFigures): void {
//         if (this.notebook?.uri.toString() !== notebook.uri.toString()) {
//             return;
//         }

//         this.notebook = notebook;
//         if (!notebook.figures.some((figure: FigureRecord) => figure.id === this.selectedFigureId)) {
//             this.selectedFigureId = notebook.figures[0]?.id;
//         }
//         this.render();
//     }

//     dispose(): void {
//         this.panel?.dispose();
//         this.disposePanel();
//     }


//     private handleMessage(message: GalleryMessage): void {
//         if (!this.notebook) {
//             return;
//         }

//         if (message.type === "selectFigure") {
//             this.selectedFigureId = message.figureId;
//             this.render();
//             return;
//         }

//         if (message.type === "revealCell") {
//             const figure = this.selectedFigure();
//             if (figure) {
//                 this.revealCell(figure);
//             }
//         }
//     }

//     private selectedFigure(): FigureRecord | undefined {
//         return this.notebook?.figures.find(
//             (figure: FigureRecord) => figure.id === this.selectedFigureId
//         );
//     }

//     private render(): void {
//         if (!this.panel || !this.notebook) {
//             return;
//         }

//         this.panel.webview.html = galleryHtml(this.notebook, this.selectedFigureId);
//     }

//     private disposePanel(): void {
//         this.panel = undefined;
//         this.panelDisposables.forEach((disposable: vscode.Disposable) => disposable.dispose());
//         this.panelDisposables = [];
//     }
// }

// function galleryHtml(
//     notebook: NotebookFigures,
//     selectedFigureId: string | undefined
// ): string {
//     const nonce = createNonce();
//     const selected = notebook.figures.find(
//         (figure: FigureRecord) => figure.id === selectedFigureId
//     );
//     const title = escapeHtml(notebook.name);

//     const thumbnails = notebook.figures.map((figure: FigureRecord, index: number) => {
//         const isSelected = figure.id === selected?.id;
//         const imageSource = dataUri(figure);
//         const label = `Figure ${index + 1}, Cell ${figure.cellIndex + 1}`;

//         return `<button class="thumbnail${isSelected ? " selected" : ""}" data-figure-id="${escapeHtml(figure.id)}" title="${escapeHtml(label)}">
//             <img src="${imageSource}" alt="${escapeHtml(label)}">
//             <span>${escapeHtml(`Figure ${index + 1}`)}</span>
//         </button>`;
//     }).join("\n");

//     const selectedImage = selected
//         ? `<img class="main-image" src="${dataUri(selected)}" alt="Selected figure">`
//         : `<p class="empty">This notebook has no PNG figure outputs yet.</p>`;

//     const selectedLabel = selected
//         ? `Cell ${selected.cellIndex + 1}`
//         : "No figure selected";

//     return `<!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
//     <title>Figures — ${title}</title>
//     <style nonce="${nonce}">
//         body {
//             margin: 0;
//             color: var(--vscode-foreground);
//             background: var(--vscode-editor-background);
//             font-family: var(--vscode-font-family);
//         }
//         header {
//             display: flex;
//             align-items: center;
//             justify-content: space-between;
//             gap: 12px;
//             padding: 12px 16px;
//             border-bottom: 1px solid var(--vscode-panel-border);
//         }
//         h1 { margin: 0; font-size: 14px; }
//         button {
//             color: inherit;
//             font: inherit;
//             cursor: pointer;
//         }
//         #reveal {
//             padding: 6px 10px;
//             border: 1px solid var(--vscode-button-border, transparent);
//             border-radius: 3px;
//             color: var(--vscode-button-foreground);
//             background: var(--vscode-button-background);
//         }
//         #reveal:hover { background: var(--vscode-button-hoverBackground); }
//         .layout {
//             display: grid;
//             grid-template-columns: minmax(210px, 30%) 1fr;
//             height: calc(100vh - 52px);
//         }
//         .thumbnails {
//             display: grid;
//             grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
//             align-content: start;
//             gap: 8px;
//             overflow-y: auto;
//             padding: 12px;
//             border-right: 1px solid var(--vscode-panel-border);
//         }
//         .thumbnail {
//             min-width: 0;
//             padding: 5px;
//             border: 1px solid transparent;
//             border-radius: 4px;
//             color: var(--vscode-foreground);
//             background: transparent;
//             text-align: left;
//         }
//         .thumbnail:hover { background: var(--vscode-list-hoverBackground); }
//         .thumbnail.selected {
//             border-color: var(--vscode-focusBorder);
//             background: var(--vscode-list-activeSelectionBackground);
//         }
//         .thumbnail img {
//             display: block;
//             width: 100%;
//             aspect-ratio: 1.4;
//             object-fit: contain;
//             background: white;
//         }
//         .thumbnail span { display: block; margin-top: 4px; font-size: 11px; }
//         .preview {
//             display: flex;
//             flex-direction: column;
//             min-width: 0;
//             overflow: auto;
//             padding: 18px;
//         }
//         .preview-label { margin: 0 0 12px; color: var(--vscode-descriptionForeground); }
//         .main-image {
//             display: block;
//             max-width: 100%;
//             height: auto;
//             margin: auto;
//             background: white;
//         }
//         .empty { color: var(--vscode-descriptionForeground); }
//         @media (max-width: 650px) {
//             .layout { grid-template-columns: 1fr; grid-template-rows: 180px 1fr; }
//             .thumbnails { border-right: 0; border-bottom: 1px solid var(--vscode-panel-border); }
//         }
//     </style>
// </head>
// <body>
//     <header>
//         <h1>${title}</h1>
//         <button id="reveal" ${selected ? "" : "disabled"}>Reveal ${escapeHtml(selectedLabel)}</button>
//     </header>
//     <main class="layout">
//         <section class="thumbnails" aria-label="Figure thumbnails">${thumbnails}</section>
//         <section class="preview">
//             <p class="preview-label">${escapeHtml(selectedLabel)}</p>
//             ${selectedImage}
//         </section>
//     </main>
//     <script nonce="${nonce}">
//         const vscode = acquireVsCodeApi();
//         document.querySelectorAll(".thumbnail").forEach((button) => {
//             button.addEventListener("click", () => {
//                 vscode.postMessage({ type: "selectFigure", figureId: button.dataset.figureId });
//             });
//         });
//         document.querySelector("#reveal").addEventListener("click", () => {
//             vscode.postMessage({ type: "revealCell" });
//         });
//     </script>
// </body>
// </html>`;
// }

// function dataUri(figure: FigureRecord): string {
//     return `data:${figure.mimeType};base64,${figure.data}`;
// }

// function createNonce(): string {
//     const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//     let value = "";

//     for (let index = 0; index < 32; index += 1) {
//         value += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
//     }

//     return value;
// }

// function escapeHtml(value: string): string {
//     return value
//         .replace(/&/g, "&amp;")
//         .replace(/</g, "&lt;")
//         .replace(/>/g, "&gt;")
//         .replace(/"/g, "&quot;")
//         .replace(/'/g, "&#039;");
// }