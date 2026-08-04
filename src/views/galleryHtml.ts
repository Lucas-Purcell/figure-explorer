function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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
body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); font-family: var(--vscode-font-family); }
header { padding: 10px 12px; border-bottom: 1px solid var(--vscode-panel-border); }
h1 { margin: 0; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.search { box-sizing: border-box; width: 100%; margin-top: 9px; padding: 6px; border: 1px solid var(--vscode-input-border, transparent); color: var(--vscode-input-foreground); background: var(--vscode-input-background); font: inherit; font-size: 12px; }
.controls { display: flex; gap: 5px; margin-top: 7px; }
.control { padding: 3px 6px; border: 1px solid transparent; border-radius: 3px; color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); font-size: 11px; cursor: pointer; }
.control.active { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
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
.source { margin: 12px; border-top: 1px solid var(--vscode-panel-border); }
.source h2 { margin: 10px 0 6px; font-size: 11px; }
.source pre { overflow-x: auto; margin: 0; padding: 8px; background: var(--vscode-textCodeBlock-background); font-family: var(--vscode-editor-font-family); font-size: 11px; white-space: pre-wrap; }
.empty { padding: 12px; color: var(--vscode-descriptionForeground); }
</style>
</head>
<body>
<header>
    <h1 id="title">Figure Gallery</h1>

    <input
        id="search"
        class="search"
        type="search"
        placeholder="Search title, code, cell:12…"
    >

    <div class="controls">
        <button class="control scope" data-scope="notebook">This notebook</button>
        <button class="control scope" data-scope="all">All open</button>
    </div>

    <div class="controls">
        <button class="control filter" data-filter="all">All</button>
        <button class="control filter" data-filter="titled">Titled</button>
        <button class="control filter" data-filter="untitled">Untitled</button>
    </div>

    <div class="result-row">
        <span id="count">0 figures</span>
        <button id="reveal" disabled>Reveal Cell</button>
    </div>
</header>

<section id="thumbnails" class="thumbnails"></section>
<section id="preview" class="preview"></section>
<section id="source" class="source"></section>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();

let catalog = [];
let selectedKey;
let scope = "notebook";
let titleFilter = "all";
let preserveThumbnailScroll = false;

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
const title = document.querySelector("#title");
const count = document.querySelector("#count");
const thumbnails = document.querySelector("#thumbnails");
const preview = document.querySelector("#preview");
const source = document.querySelector("#source");
const reveal = document.querySelector("#reveal");

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

        const img = document.querySelector("#preview-image");

        if (img) {
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

search.addEventListener("input", render);

document.querySelectorAll(".scope").forEach((button) => {
    button.addEventListener("click", () => {
        vscode.postMessage({
            type: "setScope",
            scope: button.dataset.scope,
        });
    });
});

document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
        titleFilter = button.dataset.filter;
        render();
    });
});

reveal.addEventListener("click", () => {
    vscode.postMessage({ type: "revealCell" });
});

function selectThumbnail(key) {
    selectedKey = key;

    document.querySelectorAll(".thumbnail").forEach((button) => {
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

function updatePreview() {
    const selected = catalog.find(
        (figure) => figure.key === selectedKey
    );

    if (!selected) {
        preview.innerHTML =
            '<p class="empty">No figures match the current search.</p>';

        source.innerHTML = "";
        reveal.disabled = true;
        return;
    }

    const figureTitle =
        selected.title || ("Figure " + selected.number);

    preview.innerHTML =
        "<h2>" + escapeHtml(figureTitle) + "</h2>" +
        '<img id="preview-image" class="main-image">';

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

function render() {
    const results = filteredCatalog();
    
    if (!results.some((figure) => figure.key === selectedKey)) {
        selectedKey = results[0]?.key;
        if (selectedKey) {
            vscode.postMessage({ type: "selectFigure", key: selectedKey });
        }
    }

    const selected = results.find((figure) => figure.key === selectedKey);

    document.querySelectorAll(".scope").forEach((button) => {
        button.classList.toggle("active", button.dataset.scope === scope);
    });

    document.querySelectorAll(".filter").forEach((button) => {
        button.classList.toggle("active", button.dataset.filter === titleFilter);
    });
    

    count.textContent = results.length + " of " + catalog.length + " figures";

    thumbnails.innerHTML = results.map((figure) => {
        const figureTitle = figure.title || ("Figure " + figure.number);
        const label = scope === "all"
            ? figureTitle + " · " + figure.notebookName
            : figureTitle;

        return '<button class="thumbnail' +
            (figure.key === selectedKey ? " selected" : "") +
            '" data-key="' + escapeHtml(figure.key) + '">' +
            '<img class="lazy" data-key="' +
            figure.key +
            '" src="" alt="thumbnail">'
            '<span>' + escapeHtml(label) + '</span>' +
            '</button>';
    }).join("");

    
    document.querySelectorAll(".thumbnail").forEach((button) => {
        button.addEventListener("click", () => {
            selectThumbnail(button.dataset.key);
        });
    });

    document.querySelectorAll(".thumbnail img").forEach((img) => {
        thumbnailObserver.observe(img);
    });

    updatePreview();
}

function filteredCatalog() {
    const query = search.value.trim().toLowerCase();

    return catalog.filter((figure) => {
        const isTitled = Boolean(figure.title);

        if (titleFilter === "titled" && !isTitled) return false;
        if (titleFilter === "untitled" && isTitled) return false;
        if (!query) return true;

        const title = figure.title || "";
        const code = figure.searchText;
        const cell = String(figure.cellIndex + 1);
        const number = String(figure.number);

        if (query.startsWith("cell:")) {
            return cell === query.slice(5).trim();
        }
        if (query.startsWith("figure:")) {
            return number === query.slice(7).trim();
        }
        if (query.startsWith("title:")) {
            return title.includes(query.slice(6).trim());
        }
        if (query.startsWith("code:")) {
            return code.includes(query.slice(5).trim());
        }

        return (
            code.includes(query) ||
            cell === query ||
            number === query
        );
    });
}

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