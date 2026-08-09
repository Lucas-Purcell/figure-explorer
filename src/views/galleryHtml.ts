function createNonce(): string {
    const alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let value = "";

    for (let index = 0; index < 32; index += 1) {
        value += alphabet.charAt(
            Math.floor(Math.random() * alphabet.length)
        );
    }

    return value;
}


export function galleryShellHtml(): string {
    const nonce = createNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">

<style nonce="${nonce}">
* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-width: 0;
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    font-family: var(--vscode-font-family);
}

/* ─────────────────────────────────────────────
   Header
   ───────────────────────────────────────────── */

header {
    padding: 10px 12px 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
}

h1 {
    margin: 0;
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ─────────────────────────────────────────────
   Search
   ───────────────────────────────────────────── */

.search-wrap {
    position: relative;
    min-width: 0;
    margin-top: 9px;
}

.search-icon {
    position: absolute;
    top: 50%;
    left: 7px;
    width: 13px;
    height: 13px;
    transform: translateY(-50%);
    color: var(--vscode-descriptionForeground);
    pointer-events: none;
}

.search {
    width: 100%;
    min-width: 0;
    height: 28px;
    padding: 5px 28px 5px 27px;
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 3px;
    outline: none;
    color: var(--vscode-input-foreground);
    background: var(--vscode-input-background);
    font: inherit;
    font-size: 12px;
}

.search:focus {
    border-color: var(--vscode-focusBorder);
}

.search::placeholder {
    color: var(--vscode-input-placeholderForeground);
}

.search::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
    display: none;
}

.clear-search {
    position: absolute;
    top: 50%;
    right: 5px;
    display: none;
    width: 20px;
    height: 20px;
    padding: 0;
    transform: translateY(-50%);
    border: 0;
    border-radius: 3px;
    color: var(--vscode-descriptionForeground);
    background: transparent;
    font-size: 14px;
    line-height: 20px;
    cursor: pointer;
}

.clear-search:hover {
    color: var(--vscode-foreground);
    background: var(--vscode-list-hoverBackground);
}

.clear-search.visible {
    display: block;
}

/* ─────────────────────────────────────────────
   Active search/filter state
   ───────────────────────────────────────────── */

.active-filters {
    display: none;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    margin-top: 7px;
}

.active-filters.visible {
    display: flex;
}

.filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    padding: 2px 5px 2px 7px;
    border: 1px solid var(--vscode-focusBorder);
    border-radius: 10px;
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    font-size: 10px;
}

.filter-chip-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.filter-chip-remove {
    width: 15px;
    height: 15px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    color: var(--vscode-descriptionForeground);
    background: transparent;
    font-size: 12px;
    line-height: 15px;
    cursor: pointer;
}

.filter-chip-remove:hover {
    color: var(--vscode-foreground);
    background: var(--vscode-list-hoverBackground);
}

/* Tag filters */

.tag-filter {
    position: relative;
}

.add-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.add-tag .plus {
    font-size: 13px;
    line-height: 10px;
}

.tag-panel {
    position: absolute;
    z-index: 30;
    top: calc(100% + 5px);
    left: 0;
    display: none;
    width: min(220px, calc(100vw - 24px));
    max-height: 240px;
    padding: 5px;
    overflow-y: auto;
    border: 1px solid var(
        --vscode-widget-border,
        var(--vscode-panel-border)
    );
    border-radius: 4px;
    background: var(--vscode-menu-background);
    box-shadow: 0 3px 8px var(--vscode-widget-shadow);
}

.tag-panel.open {
    display: block;
}

.tag-option {
    display: block;
    width: 100%;
    padding: 5px 7px;
    border: 0;
    border-radius: 2px;
    color: var(--vscode-menu-foreground);
    background: transparent;
    text-align: left;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
}

.tag-option:hover {
    color: var(--vscode-menu-selectionForeground);
    background: var(--vscode-menu-selectionBackground);
}

.tag-option.active {
    color: var(--vscode-descriptionForeground);
    background: var(--vscode-list-inactiveSelectionBackground);
}

.tag-option:disabled {
    cursor: default;
    opacity: 0.55;
}

.tag-empty {
    padding: 7px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
}

/* ─────────────────────────────────────────────
   Toolbar
   ───────────────────────────────────────────── */

.toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
}

.toolbar-group {
    display: flex;
    min-width: 0;
    border: 1px solid var(
        --vscode-widget-border,
        var(--vscode-panel-border)
    );
    border-radius: 4px;
    overflow: hidden;
}

.control {
    min-width: 0;
    padding: 4px 8px;
    border: 0;
    border-right: 1px solid var(
        --vscode-widget-border,
        var(--vscode-panel-border)
    );
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
}

.control:last-child {
    border-right: 0;
}

.control:hover {
    background: var(--vscode-list-hoverBackground);
}

.control.active {
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
}

/* Scope selector */
.scope-group {
    flex: 1 1 auto;
    min-width: 0;
}

.scope-group .control {
    flex: 1 1 0;
}

/* Filters dropdown */
.filter-menu {
    position: relative;
}

.filters-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.filters-button .chevron {
    font-size: 9px;
    opacity: 0.7;
}

.filter-panel {
    position: absolute;
    z-index: 20;
    top: calc(100% + 5px);
    right: 0;
    display: none;
    min-width: 130px;
    padding: 4px;
    border: 1px solid var(
        --vscode-widget-border,
        var(--vscode-panel-border)
    );
    border-radius: 4px;
    background: var(--vscode-menu-background);
    box-shadow: 0 3px 8px var(--vscode-widget-shadow);
}

.filter-panel.open {
    display: block;
}

.filter-option {
    display: block;
    width: 100%;
    padding: 5px 7px;
    border: 0;
    border-radius: 2px;
    color: var(--vscode-menu-foreground);
    background: transparent;
    text-align: left;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
}

.filter-option:hover {
    color: var(--vscode-menu-selectionForeground);
    background: var(--vscode-menu-selectionBackground);
}

.filter-option.active {
    color: var(--vscode-menu-selectionForeground);
    background: var(--vscode-menu-selectionBackground);
}

/* ─────────────────────────────────────────────
   Result row
   ───────────────────────────────────────────── */

.result-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    margin-top: 8px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
}

#count {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

#reveal {
    flex: 0 0 auto;
    padding: 4px 7px;
    border: 0;
    border-radius: 3px;
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
}

#reveal:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
}

#reveal:disabled {
    opacity: 0.5;
    cursor: default;
}

/* ─────────────────────────────────────────────
   Thumbnail gallery
   ───────────────────────────────────────────── */

.thumbnails {
    display: grid;
    grid-template-columns: repeat(
        auto-fill,
        minmax(76px, 1fr)
    );
    gap: 7px;
    max-height: 250px;
    min-width: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
}

.thumbnail {
    min-width: 0;
    padding: 4px;
    border: 1px solid transparent;
    border-radius: 3px;
    color: var(--vscode-foreground);
    background: transparent;
    text-align: left;
    cursor: pointer;
}

.thumbnail:hover {
    background: var(--vscode-list-hoverBackground);
}

.thumbnail.selected {
    border-color: var(--vscode-focusBorder);
    background: var(--vscode-list-activeSelectionBackground);
}

.thumbnail img {
    display: block;
    width: 100%;
    aspect-ratio: 1.35;
    object-fit: contain;
    background: white;
}

.thumbnail span {
    display: block;
    min-width: 0;
    overflow: hidden;
    margin-top: 3px;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ─────────────────────────────────────────────
   Preview
   ───────────────────────────────────────────── */

.preview {
    min-width: 0;
    padding: 12px;
}

.preview h2 {
    margin: 0;
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Tags */
.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 7px;
}

.tag {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    padding: 2px 7px;
    border: 1px solid var(
        --vscode-button-secondaryBackground
    );
    border-radius: 10px;
    color: var(--vscode-descriptionForeground);
    background: var(--vscode-button-secondaryBackground);
    font-size: 10px;
    cursor: pointer;
}

.tag:hover {
    color: var(--vscode-foreground);
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
}

.main-image {
    display: block;
    width: 100%;
    max-width: 100%;
    height: 300px;
    margin-top: 10px;
    object-fit: contain;
    background: white;
    opacity: 0;
    transition: opacity 120ms ease-in-out;
}

.main-image.loaded {
    opacity: 1;
}

/* ─────────────────────────────────────────────
   Source
   ───────────────────────────────────────────── */

.source {
    min-width: 0;
    margin: 0 12px;
    border-top: 1px solid var(--vscode-panel-border);
}

.source h2 {
    margin: 10px 0 6px;
    font-size: 11px;
    font-weight: 600;
}

.source pre {
    max-width: 100%;
    overflow-x: auto;
    margin: 0;
    padding: 8px;
    background: var(--vscode-textCodeBlock-background);
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.empty {
    padding: 12px;
    color: var(--vscode-descriptionForeground);
}

/* ─────────────────────────────────────────────
   Narrow sidebar behavior
   ───────────────────────────────────────────── */

@media (max-width: 260px) {
    header {
        padding-left: 8px;
        padding-right: 8px;
    }

    .toolbar {
        display: grid;
        grid-template-columns: 1fr;
    }

    .scope-group {
        width: 100%;
    }

    .filter-menu {
        width: 100%;
    }

    .filters-button {
        width: 100%;
        justify-content: space-between;
    }

    .filter-panel {
        left: 0;
        right: 0;
        width: 100%;
    }

    .thumbnails {
        padding: 7px;
        gap: 5px;
        grid-template-columns: repeat(
            auto-fill,
            minmax(64px, 1fr)
        );
    }

    .preview {
        padding: 8px;
    }

    .source {
        margin-left: 8px;
        margin-right: 8px;
    }

    .main-image {
        height: 240px;
    }
}
</style>
</head>

<body>

<header>

    <h1 id="title">Figure Gallery</h1>

    <div class="search-wrap">

        <svg
            class="search-icon"
            viewBox="0 0 16 16"
            aria-hidden="true"
        >
            <circle
                cx="7"
                cy="7"
                r="4.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
            />
            <path
                d="M10.5 10.5 L14 14"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
            />
        </svg>

        <input
            id="search"
            class="search"
            type="search"
            placeholder="Search figures…"
            autocomplete="off"
            spellcheck="false"
        >

        <button
            id="clear-search"
            class="clear-search"
            type="button"
            aria-label="Clear search"
        >
            ×
        </button>

    </div>

    <div id="active-filters" class="active-filters"></div>
    
    <div class="toolbar">

        <div class="tag-filter">

            <button
                id="add-tag"
                class="control add-tag"
                type="button"
            >
                <span class="plus">+</span>
                Add tag
            </button>

            <div
                id="tag-panel"
                class="tag-panel"
            ></div>

        </div>

        <div class="toolbar-group scope-group">

            <button
                class="control scope"
                data-scope="notebook"
            >
                This notebook
            </button>

            <button
                class="control scope"
                data-scope="all"
            >
                All open
            </button>

        </div>

        <div class="filter-menu">

            <button
                id="filters-button"
                class="control filters-button"
                type="button"
            >
                Filters
                <span class="chevron">▼</span>
            </button>

            <div id="filter-panel" class="filter-panel">

                <button
                    class="filter-option"
                    data-filter="all"
                >
                    All figures
                </button>

                <button
                    class="filter-option"
                    data-filter="titled"
                >
                    Titled
                </button>

                <button
                    class="filter-option"
                    data-filter="untitled"
                >
                    Untitled
                </button>

            </div>

        </div>

    </div>

    <div class="result-row">

        <span id="count">0 figures</span>

        <button id="reveal" disabled>
            Reveal Cell
        </button>

    </div>

</header>

<section
    id="thumbnails"
    class="thumbnails"
></section>

<section
    id="preview"
    class="preview"
></section>

<section
    id="source"
    class="source"
></section>

<script nonce="${nonce}">

const vscode = acquireVsCodeApi();

let catalog = [];
let selectedKey;
let scope = "notebook";
let titleFilter = "all";
let activeTags = [];

const thumbnailObserver = new IntersectionObserver(
    (entries) => {

        entries.forEach((entry) => {

            if (!entry.isIntersecting) {
                return;
            }

            const img = entry.target;

            if (img.dataset.loaded === "1") {
                return;
            }

            vscode.postMessage({
                type: "requestThumbnail",
                key: img.dataset.key,
            });

            thumbnailObserver.unobserve(img);

        });

    },
    {
        root: document.querySelector("#thumbnails"),
        threshold: 0.05,
    }
);

const search = document.querySelector("#search");
const clearSearch = document.querySelector("#clear-search");
const activeFilters = document.querySelector("#active-filters");
const addTag = document.querySelector("#add-tag");
const tagPanel = document.querySelector("#tag-panel");

const title = document.querySelector("#title");
const count = document.querySelector("#count");

const thumbnails = document.querySelector("#thumbnails");
const preview = document.querySelector("#preview");
const source = document.querySelector("#source");
const reveal = document.querySelector("#reveal");

const filtersButton =
    document.querySelector("#filters-button");

const filterPanel =
    document.querySelector("#filter-panel");

/* ─────────────────────────────────────────────
   Messages from extension
   ───────────────────────────────────────────── */

window.addEventListener("message", (event) => {

    const message = event.data;

    if (message.type === "thumbnail") {

        const img = document.querySelector(
            'img[data-key="' + message.key + '"]'
        );

        if (img) {

            img.src =
                "data:" +
                message.mimeType +
                ";base64," +
                message.data;

            img.dataset.loaded = "1";
        }

        return;
    }

    if (message.type === "preview") {

        const img =
            document.querySelector("#preview-image");

        if (img) {

            img.onload = () => {
                img.classList.add("loaded");
            };

            img.src =
                "data:" +
                message.mimeType +
                ";base64," +
                message.data;
        }

        return;
    }

    if (message.type !== "setCatalog") {
        return;
    }

    catalog = message.figures;
    selectedKey = message.selectedKey;
    scope = message.scope;

    title.textContent =
        scope === "all"
            ? "All open notebooks"
            : message.notebookName || "Figure Gallery";

    render();
});

/* ─────────────────────────────────────────────
   Search
   ───────────────────────────────────────────── */

search.addEventListener("input", () => {
    updateSearchUI();
    render();
});

clearSearch.addEventListener("click", () => {
    search.value = "";
    updateSearchUI();
    search.focus();
    render();
});

/* ─────────────────────────────────────────────
   Scope
   ───────────────────────────────────────────── */

document.querySelectorAll(".scope").forEach((button) => {

    button.addEventListener("click", () => {

        vscode.postMessage({
            type: "setScope",
            scope: button.dataset.scope,
        });

    });

});

/* ─────────────────────────────────────────────
   Filter menu
   ───────────────────────────────────────────── */

filtersButton.addEventListener("click", (event) => {

    event.stopPropagation();

    filterPanel.classList.toggle("open");

});

document.addEventListener("click", (event) => {

    if (!filterPanel.contains(event.target) &&
        event.target !== filtersButton) {

        filterPanel.classList.remove("open");
    }

});

document.querySelectorAll(".filter-option").forEach((button) => {

    button.addEventListener("click", () => {

        titleFilter = button.dataset.filter;

        filterPanel.classList.remove("open");

        render();

    });

});

/* ─────────────────────────────────────────────
   Tag filters
   ───────────────────────────────────────────── */

addTag.addEventListener("click", (event) => {

    event.stopPropagation();

    renderTagPanel();

    tagPanel.classList.toggle("open");

});

document.addEventListener("click", (event) => {

    if (
        !tagPanel.contains(event.target) &&
        event.target !== addTag
    ) {
        tagPanel.classList.remove("open");
    }

});

function renderTagPanel() {

    const tags = Array.from(
        new Set(
            catalog.flatMap(
                (figure) => figure.tags || []
            )
        )
    ).sort(
        (a, b) => a.localeCompare(b)
    );

    if (tags.length === 0) {

        tagPanel.innerHTML =
            '<div class="tag-empty">' +
            'No tags available' +
            '</div>';

        return;
    }

    tagPanel.innerHTML =
        tags.map((tag) => {

            const active =
                activeTags.some(
                    (activeTag) =>
                        activeTag.toLowerCase() ===
                        tag.toLowerCase()
                );

            return (
                '<button ' +
                'class="tag-option' +
                (active ? " active" : "") +
                '" ' +
                'type="button" ' +
                'data-tag="' +
                escapeHtml(tag) +
                '"' +
                (active ? " disabled" : "") +
                '>' +
                escapeHtml(tag) +
                '</button>'
            );

        }).join("");

    tagPanel
        .querySelectorAll(".tag-option:not(:disabled)")
        .forEach((button) => {

            button.addEventListener("click", () => {

                addTagFilter(
                    button.dataset.tag
                );

            });

        });

}

function addTagFilter(tag) {

    const normalized =
        tag.trim().toLowerCase();

    if (!normalized) {
        return;
    }

    const alreadyActive =
        activeTags.some(
            (activeTag) =>
                activeTag.toLowerCase() === normalized
        );

    if (alreadyActive) {
        return;
    }

    activeTags.push(tag.trim());

    renderTagPanel();
    updateSearchUI();
    render();

}

function removeTagFilter(tag) {

    activeTags =
        activeTags.filter(
            (activeTag) =>
                activeTag.toLowerCase() !==
                tag.toLowerCase()
        );

    renderTagPanel();
    updateSearchUI();
    render();

}

/* ─────────────────────────────────────────────
   Reveal
   ───────────────────────────────────────────── */

reveal.addEventListener("click", () => {

    vscode.postMessage({
        type: "revealCell"
    });

});

/* ─────────────────────────────────────────────
   Thumbnail selection
   ───────────────────────────────────────────── */

function selectThumbnail(key) {

    selectedKey = key;

    document
        .querySelectorAll(".thumbnail")
        .forEach((button) => {

            button.classList.toggle(
                "selected",
                button.dataset.key === key
            );

        });

    vscode.postMessage({
        type: "selectFigure",
        key
    });

    updatePreview();

}

/* ─────────────────────────────────────────────
   Preview
   ───────────────────────────────────────────── */

function updatePreview() {

    const selected = catalog.find(
        (figure) => figure.key === selectedKey
    );

    if (!selected) {

        preview.innerHTML =
            '<p class="empty">' +
            'No figures match the current search.' +
            '</p>';

        source.innerHTML = "";
        reveal.disabled = true;

        return;
    }

    const figureTitle =
        selected.title ||
        ("Figure " + selected.number);

    const tags = selected.tags || [];

    const tagHtml = tags.length > 0
        ? '<div class="tags">' +
            tags.map((tag) =>
                '<span class="tag" data-tag="' +
                escapeHtml(tag) +
                '">' +
                escapeHtml(tag) +
                '</span>'
            ).join("") +
        '</div>'
        : "";

    preview.innerHTML =
        "<h2>" +
        escapeHtml(figureTitle) +
        "</h2>" +
        tagHtml +
        '<img id="preview-image" ' +
        'class="main-image" ' +
        'alt="preview">';

    preview
        .querySelectorAll(".tag")
        .forEach((button) => {

            button.addEventListener("click", () => {

                addTagFilter(button.dataset.tag);

            });

        });

    vscode.postMessage({
        type: "requestPreview",
        key: selected.key
    });

    source.innerHTML =
        "<h2>" +
        escapeHtml(selected.notebookName) +
        " · Cell " +
        (selected.cellIndex + 1) +
        "</h2>" +
        "<pre>" +
        escapeHtml(selected.codeSnippet) +
        "</pre>";

    reveal.disabled = false;

}

/* ─────────────────────────────────────────────
   Render
   ───────────────────────────────────────────── */

function render() {

    const results = filteredCatalog();

    if (
        !results.some(
            (figure) => figure.key === selectedKey
        )
    ) {

        selectedKey = results[0]?.key;

        if (selectedKey) {

            vscode.postMessage({
                type: "selectFigure",
                key: selectedKey
            });

        }

    }

    document
        .querySelectorAll(".scope")
        .forEach((button) => {

            button.classList.toggle(
                "active",
                button.dataset.scope === scope
            );

        });

    document
        .querySelectorAll(".filter-option")
        .forEach((button) => {

            button.classList.toggle(
                "active",
                button.dataset.filter === titleFilter
            );

        });

    const filterIsActive =
        titleFilter !== "all";

    filtersButton.classList.toggle(
        "active",
        filterIsActive
    );

    addTag.classList.toggle(
        "active",
        activeTags.length > 0
    );

    count.textContent =
        results.length +
        " of " +
        catalog.length +
        " figures";

    thumbnails.innerHTML =
        results.map((figure) => {

            const figureTitle =
                figure.title ||
                ("Figure " + figure.number);

            const label =
                scope === "all"
                    ? figureTitle +
                      " · " +
                      figure.notebookName
                    : figureTitle;

            return (
                '<button class="thumbnail' +
                (
                    figure.key === selectedKey
                        ? " selected"
                        : ""
                ) +
                '" data-key="' +
                escapeHtml(figure.key) +
                '">' +

                '<img class="lazy" ' +
                'data-key="' +
                escapeHtml(figure.key) +
                '" ' +
                'src="" ' +
                'alt="thumbnail">' +

                '<span>' +
                escapeHtml(label) +
                '</span>' +

                '</button>'
            );

        }).join("");

    document
        .querySelectorAll(".thumbnail")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {
                    selectThumbnail(
                        button.dataset.key
                    );
                }
            );

        });

    document
        .querySelectorAll(".thumbnail img")
        .forEach((img) => {

            thumbnailObserver.observe(img);

        });

    updateSearchUI();
    updatePreview();

}

/* ─────────────────────────────────────────────
   Search UI
   ───────────────────────────────────────────── */

function updateSearchUI() {

    const query =
        search.value.trim();

    clearSearch.classList.toggle(
        "visible",
        query.length > 0
    );

    activeFilters.innerHTML = "";

    let hasFilters = false;

    /*
     * Text-search filter
     */

    if (query) {

        let label = "";

        const tagMatch =
            query.match(/^tag:(.+)$/i);

        const titleMatch =
            query.match(/^title:(.+)$/i);

        const cellMatch =
            query.match(/^cell:(.+)$/i);

        const figureMatch =
            query.match(/^figure:(.+)$/i);

        const codeMatch =
            query.match(/^code:(.+)$/i);

        if (tagMatch) {
            label = "Tag: " + tagMatch[1].trim();
        } else if (titleMatch) {
            label = "Title: " + titleMatch[1].trim();
        } else if (cellMatch) {
            label = "Cell: " + cellMatch[1].trim();
        } else if (figureMatch) {
            label = "Figure: " + figureMatch[1].trim();
        } else if (codeMatch) {
            label = "Code: " + codeMatch[1].trim();
        }

        /*
         * Only show a chip for structured search syntax.
         * Ordinary text such as "gini" stays in the search box.
         */

        if (label) {

            appendFilterChip(
                label,
                () => {
                    search.value = "";
                    updateSearchUI();
                    render();
                    search.focus();
                }
            );

            hasFilters = true;
        }

    }

    /*
     * Tag filters
     */

    activeTags.forEach((tag) => {

        appendFilterChip(
            tag,
            () => {
                removeTagFilter(tag);
            }
        );

        hasFilters = true;

    });

    activeFilters.classList.toggle(
        "visible",
        hasFilters
    );

}

function appendFilterChip(label, onRemove) {

    const chip =
        document.createElement("div");

    chip.className = "filter-chip";

    const labelElement =
        document.createElement("span");

    labelElement.className =
        "filter-chip-label";

    labelElement.textContent = label;

    const remove =
        document.createElement("button");

    remove.className =
        "filter-chip-remove";

    remove.type = "button";
    remove.textContent = "×";

    remove.setAttribute(
        "aria-label",
        "Remove " + label
    );

    remove.addEventListener(
        "click",
        onRemove
    );

    chip.appendChild(labelElement);
    chip.appendChild(remove);

    activeFilters.appendChild(chip);

}

/* ─────────────────────────────────────────────
   Filtering
   ───────────────────────────────────────────── */

function filteredCatalog() {

    const query =
        search.value.trim().toLowerCase();

    return catalog.filter((figure) => {

        const isTitled =
            Boolean(figure.title);

        /*
         * Title filter
         */

        if (
            titleFilter === "titled" &&
            !isTitled
        ) {
            return false;
        }

        if (
            titleFilter === "untitled" &&
            isTitled
        ) {
            return false;
        }

        /*
         * Tag filters
         *
         * Every active tag must be present.
         * Therefore multiple tags are ANDed.
         */

        const figureTags =
            (figure.tags || []).map(
                (tag) => tag.toLowerCase()
            );

        const matchesTags =
            activeTags.every(
                (activeTag) =>
                    figureTags.includes(
                        activeTag.toLowerCase()
                    )
            );

        if (!matchesTags) {
            return false;
        }

        /*
         * Text search
         *
         * This is completely independent of activeTags.
         */

        if (!query) {
            return true;
        }

        const title =
            figure.title || "";

        const tags =
            (figure.tags || []).join(" ");

        const code =
            figure.searchText || "";

        const cell =
            String(figure.cellIndex + 1);

        const number =
            String(figure.number);

        if (query.startsWith("cell:")) {

            return (
                cell ===
                query.slice(5).trim()
            );

        }

        if (query.startsWith("figure:")) {

            return (
                number ===
                query.slice(7).trim()
            );

        }

        if (query.startsWith("title:")) {

            return title
                .toLowerCase()
                .includes(
                    query.slice(6).trim()
                );

        }

        /*
         * Keep tag: working as a legacy/manual search syntax.
         *
         * It searches for one tag in addition to the
         * dedicated active tag filters.
         */

        if (query.startsWith("tag:")) {

            const tagQuery =
                query
                    .slice(4)
                    .trim()
                    .toLowerCase();

            return figureTags.includes(
                tagQuery
            );

        }

        if (query.startsWith("code:")) {

            return code
                .toLowerCase()
                .includes(
                    query.slice(5).trim()
                );

        }

        /*
         * General text search
         */

        return (
            code.toLowerCase().includes(query) ||
            tags.toLowerCase().includes(query) ||
            title.toLowerCase().includes(query) ||
            cell === query ||
            number === query
        );

    });

}

/* ─────────────────────────────────────────────
   HTML escaping
   ───────────────────────────────────────────── */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

</script>

</body>
</html>`;
}
