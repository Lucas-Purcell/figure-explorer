import * as fs from "node:fs";
import * as path from "node:path";

const css = fs.readFileSync(
    path.join(__dirname, "gallery.css"),
    "utf8"
);

const script = fs.readFileSync(
    path.join(__dirname, "galleryScript.js"),
    "utf8"
);
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


export function galleryShellHtml(editorMode = false): string {
    const nonce = createNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <style nonce="${nonce}">
        ${css}
    </style>
</head>

<body class="${editorMode ? "editor-mode" : ""}">

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

        <div class="result-actions">

            <button
                id="compare"
                disabled
            >
                Compare
            </button>

            <button id="reveal" disabled>
                Reveal Cell
            </button>

        </div>

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
${script}
</script>

</body>
</html>`;
}
