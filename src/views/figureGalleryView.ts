import * as vscode from "vscode";
import { FigureRecord, NotebookFigures } from "../notebook/types";
import { figureRegistry } from "../registry/figureRegistry";

type TitleFilter = "all" | "titled" | "untitled";
type SearchScope = "notebook" | "all";

interface FigureSearchResult {
    key: string;
    notebook: NotebookFigures;
    figure: FigureRecord;
    number: number;
}

type GalleryMessage =
    | { type: "selectFigure"; key: string }
    | { type: "setSearch"; query: string }
    | { type: "setTitleFilter"; filter: TitleFilter }
    | { type: "setSearchScope"; scope: SearchScope }
    | { type: "revealCell" };

export class FigureGalleryViewProvider
    implements vscode.WebviewViewProvider, vscode.Disposable {
    private view: vscode.WebviewView | undefined;
    private notebook: NotebookFigures | undefined;
    private selectedResultKey: string | undefined;
    private searchQuery = "";
    private titleFilter: TitleFilter = "all";
    private searchScope: SearchScope = "notebook";
    private readonly disposables: vscode.Disposable[] = [];

    constructor(private readonly revealCell: (figure: FigureRecord) => void) {}

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        webviewView.webview.options = { enableScripts: true };

        webviewView.webview.onDidReceiveMessage(
            (message: GalleryMessage) => this.handleMessage(message),
            undefined,
            this.disposables
        );

        webviewView.onDidDispose(() => {
            this.view = undefined;
        }, undefined, this.disposables);

        this.render();
    }

    show(notebook: NotebookFigures, selectedFigureId?: string): void {
        this.notebook = notebook;

        if (selectedFigureId) {
            this.selectedResultKey = resultKey(
                notebook,
                selectedFigureId
            );
        }

        this.ensureSelectedResult();
        this.view?.show(false);
        this.render();
    }

    refreshIfShowing(notebook: NotebookFigures): void {
        if (this.notebook?.uri.toString() !== notebook.uri.toString()) {
            return;
        }

        this.notebook = notebook;
        this.ensureSelectedResult();
        this.render();
    }

    dispose(): void {
        this.disposables.forEach((disposable) => disposable.dispose());
    }

    private handleMessage(message: GalleryMessage): void {
        if (message.type === "setSearch") {
            this.searchQuery = message.query;
            this.ensureSelectedResult();
            this.render(true);
            return;
        }

        if (message.type === "setTitleFilter") {
            this.titleFilter = message.filter;
            this.ensureSelectedResult();
            this.render();
            return;
        }

        if (message.type === "setSearchScope") {
            this.searchScope = message.scope;
            this.ensureSelectedResult();
            this.render();
            return;
        }

        if (message.type === "selectFigure") {
            this.selectedResultKey = message.key;
            this.render();
            return;
        }

        if (message.type === "revealCell") {
            const result = this.selectedResult();
            if (result) {
                this.revealCell(result.figure);
            }
        }
    }

    private searchResults(): FigureSearchResult[] {
        const notebooks = this.searchScope === "all"
            ? figureRegistry.getNotebooks()
            : this.notebook ? [this.notebook] : [];

        return notebooks.flatMap((notebook) =>
            notebook.figures.flatMap((figure, index) => {
                const number = index + 1;

                if (
                    !matchesTitleFilter(figure, this.titleFilter) ||
                    !matchesSearch(figure, number, this.searchQuery)
                ) {
                    return [];
                }

                return [{
                    key: resultKey(notebook, figure.id),
                    notebook,
                    figure,
                    number,
                }];
            })
        );
    }

    private ensureSelectedResult(): void {
        const results = this.searchResults();

        if (!results.some((result) => result.key === this.selectedResultKey)) {
            this.selectedResultKey = results[0]?.key;
        }
    }

    private selectedResult(): FigureSearchResult | undefined {
        return this.searchResults().find(
            (result) => result.key === this.selectedResultKey
        );
    }

    private render(focusSearch = false): void {
        if (!this.view) {
            return;
        }

        const results = this.searchResults();
        const totalFigures = this.searchScope === "all"
            ? figureRegistry.getNotebooks().reduce(
                (total, notebook) => total + notebook.figures.length,
                0
            )
            : this.notebook?.figures.length ?? 0;

        this.view.webview.html = galleryHtml(
            this.notebook,
            results,
            this.selectedResultKey,
            this.searchQuery,
            this.titleFilter,
            this.searchScope,
            totalFigures,
            focusSearch
        );
    }
}

function resultKey(notebook: NotebookFigures, figureId: string): string {
    return `${notebook.uri.toString()}::${figureId}`;
}

function matchesTitleFilter(
    figure: FigureRecord,
    filter: TitleFilter
): boolean {
    if (filter === "titled") {
        return Boolean(figure.title);
    }

    if (filter === "untitled") {
        return !figure.title;
    }

    return true;
}

function matchesSearch(
    figure: FigureRecord,
    number: number,
    rawQuery: string
): boolean {
    const query = rawQuery.trim().toLowerCase();

    if (!query) {
        return true;
    }

    const title = figure.title?.toLowerCase() ?? "";
    const code = figure.cellSource.toLowerCase();
    const cell = String(figure.cellIndex + 1);
    const figureNumber = String(number);

    if (query.startsWith("cell:")) {
        return cell === query.slice("cell:".length).trim();
    }

    if (query.startsWith("figure:")) {
        return figureNumber === query.slice("figure:".length).trim();
    }

    if (query.startsWith("title:")) {
        return title.includes(query.slice("title:".length).trim());
    }

    if (query.startsWith("code:")) {
        return code.includes(query.slice("code:".length).trim());
    }

    return [
        title,
        code,
        cell,
        figureNumber,
        figure.mimeType.toLowerCase(),
    ].some((value) => value.includes(query));
}

function galleryHtml(
    notebook: NotebookFigures | undefined,
    results: FigureSearchResult[],
    selectedKey: string | undefined,
    searchQuery: string,
    titleFilter: TitleFilter,
    searchScope: SearchScope,
    totalFigures: number,
    focusSearch: boolean
): string {
    const nonce = createNonce();

    if (!notebook) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';">
<style nonce="${nonce}">
body { padding: 12px; color: var(--vscode-descriptionForeground); font-family: var(--vscode-font-family); }
</style>
</head>
<body>Select a notebook or figure in the Figure Explorer.</body>
</html>`;
    }

    const selected = results.find((result) => result.key === selectedKey);
    const heading = searchScope === "all"
        ? "All open notebooks"
        : notebook.name;

    const thumbnails = results.map((result) => {
        const { figure, number } = result;
        const figureTitle = displayTitle(figure, number);
        const label = searchScope === "all"
            ? `${figureTitle} · ${result.notebook.name}`
            : figureTitle;

        return `<button
    class="thumbnail${result.key === selected?.key ? " selected" : ""}"
    data-key="${escapeHtml(result.key)}"
    title="${escapeHtml(`${label}, Cell ${figure.cellIndex + 1}`)}"
>
    <img src="${dataUri(figure)}" alt="${escapeHtml(label)}">
    <span>${escapeHtml(label)}</span>
</button>`;
    }).join("\n");

    const preview = selected
        ? `<img class="main-image" src="${dataUri(selected.figure)}" alt="${escapeHtml(displayTitle(selected.figure, selected.number))}">`
        : `<p class="empty">No figures match the current search and filters.</p>`;

    const source = selected
        ? `<section class="source">
    <h2>${escapeHtml(selected.notebook.name)} · Cell ${selected.figure.cellIndex + 1}</h2>
    <pre>${escapeHtml(selected.figure.codeSnippet)}</pre>
</section>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); font-family: var(--vscode-font-family); }
header { padding: 10px 12px; border-bottom: 1px solid var(--vscode-panel-border); }
h1 { margin: 0; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.search { box-sizing: border-box; width: 100%; margin-top: 9px; padding: 6px; border: 1px solid var(--vscode-input-border, transparent); color: var(--vscode-input-foreground); background: var(--vscode-input-background); font: inherit; font-size: 12px; }
.filters, .scope { display: flex; gap: 5px; margin-top: 7px; }
.filter, .scope-button { padding: 3px 6px; border: 1px solid transparent; border-radius: 3px; color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); font-size: 11px; cursor: pointer; }
.filter.active, .scope-button.active { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
.result-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; color: var(--vscode-descriptionForeground); font-size: 11px; }
#reveal { padding: 4px 7px; border: 0; border-radius: 3px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); cursor: pointer; }
.thumbnails { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 7px; max-height: 250px; overflow-y: auto; padding: 10px; border-bottom: 1px solid var(--vscode-panel-border); }
.thumbnail { min-width: 0; padding: 4px; border: 1px solid transparent; border-radius: 3px; color: var(--vscode-foreground); background: transparent; text-align: left; cursor: pointer; }
.thumbnail:hover { background: var(--vscode-list-hoverBackground); }
.thumbnail.selected { border-color: var(--vscode-focusBorder); background: var(--vscode-list-activeSelectionBackground); }
.thumbnail img { display: block; width: 100%; aspect-ratio: 1.35; object-fit: contain; background: white; }
.thumbnail span { display: block; overflow: hidden; margin-top: 3px; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.preview { padding: 12px; }
.main-image { display: block; width: 100%; height: auto; background: white; }
.empty { color: var(--vscode-descriptionForeground); }
.source { margin: 12px; border-top: 1px solid var(--vscode-panel-border); }
.source h2 { margin: 10px 0 6px; font-size: 11px; }
.source pre { overflow-x: auto; margin: 0; padding: 8px; background: var(--vscode-textCodeBlock-background); font-family: var(--vscode-editor-font-family); font-size: 11px; white-space: pre-wrap; }
</style>
</head>
<body>
<header>
    <h1>${escapeHtml(heading)}</h1>

    <input
        id="search"
        class="search"
        type="search"
        value="${escapeHtml(searchQuery)}"
        placeholder="Search title, code, cell:12…"
    >

    <div class="scope">
        <button class="scope-button ${searchScope === "notebook" ? "active" : ""}" data-scope="notebook">This notebook</button>
        <button class="scope-button ${searchScope === "all" ? "active" : ""}" data-scope="all">All open</button>
    </div>

    <div class="filters">
        <button class="filter ${titleFilter === "all" ? "active" : ""}" data-filter="all">All</button>
        <button class="filter ${titleFilter === "titled" ? "active" : ""}" data-filter="titled">Titled</button>
        <button class="filter ${titleFilter === "untitled" ? "active" : ""}" data-filter="untitled">Untitled</button>
    </div>

    <div class="result-row">
        <span>${results.length} of ${totalFigures} figures</span>
        <button id="reveal" ${selected ? "" : "disabled"}>Reveal Cell</button>
    </div>
</header>

<section class="thumbnails">${thumbnails}</section>
<section class="preview">${preview}</section>
${source}

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const search = document.querySelector("#search");

search.addEventListener("input", () => {
    vscode.postMessage({ type: "setSearch", query: search.value });
});

document.querySelectorAll(".scope-button").forEach((button) => {
    button.addEventListener("click", () => {
        vscode.postMessage({ type: "setSearchScope", scope: button.dataset.scope });
    });
});

document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
        vscode.postMessage({ type: "setTitleFilter", filter: button.dataset.filter });
    });
});

document.querySelectorAll(".thumbnail").forEach((button) => {
    button.addEventListener("click", () => {
        vscode.postMessage({ type: "selectFigure", key: button.dataset.key });
    });
});

document.querySelector("#reveal").addEventListener("click", () => {
    vscode.postMessage({ type: "revealCell" });
});

${focusSearch ? "search.focus(); search.setSelectionRange(search.value.length, search.value.length);" : ""}
</script>
</body>
</html>`;
}

function displayTitle(figure: FigureRecord, number: number): string {
    return figure.title ?? `Figure ${number}`;
}

function dataUri(figure: FigureRecord): string {
    return `data:${figure.mimeType};base64,${figure.data}`;
}

function createNonce(): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let value = "";

    for (let index = 0; index < 32; index += 1) {
        value += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    return value;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}