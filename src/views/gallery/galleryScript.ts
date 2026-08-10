/// <reference lib="dom" />

interface GalleryFigure {
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
}

interface GalleryCatalogMessage {
    type: "setCatalog";
    figures: GalleryFigure[];
    selectedKey?: string;
    scope: "notebook" | "all";
    notebookName?: string;
    totalFigures: number;
}

interface GalleryThumbnailMessage {
    type: "thumbnail";
    key: string;
    mimeType: string;
    data: string;
}

interface GalleryPreviewMessage {
    type: "preview";
    key: string;
    mimeType: string;
    data: string;
}

type GalleryWebviewMessage =
    | GalleryCatalogMessage
    | GalleryThumbnailMessage
    | GalleryPreviewMessage;

interface GalleryVsCodeMessage {
    type:
        | "requestThumbnail"
        | "requestPreview"
        | "selectFigure"
        | "setScope"
        | "revealCell";
    key?: string;
    scope?: "notebook" | "all";
}

interface VsCodeApi {
    postMessage(message: GalleryVsCodeMessage): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

let catalog: GalleryFigure[] = [];
let selectedKey: string | undefined;
let scope: "notebook" | "all" = "notebook";
let titleFilter: "all" | "titled" | "untitled" = "all";
let activeTags: string[] = [];

/* ─────────────────────────────────────────────
   DOM elements
   ───────────────────────────────────────────── */

const search =
    getElement<HTMLInputElement>("#search");

const clearSearch =
    getElement<HTMLButtonElement>("#clear-search");

const activeFilters =
    getElement<HTMLDivElement>("#active-filters");

const addTag =
    getElement<HTMLButtonElement>("#add-tag");

const tagPanel =
    getElement<HTMLDivElement>("#tag-panel");

const title =
    getElement<HTMLHeadingElement>("#title");

const count =
    getElement<HTMLSpanElement>("#count");

const thumbnails =
    getElement<HTMLElement>("#thumbnails");

const preview =
    getElement<HTMLElement>("#preview");

const source =
    getElement<HTMLElement>("#source");

const reveal =
    getElement<HTMLButtonElement>("#reveal");

const filtersButton =
    getElement<HTMLButtonElement>("#filters-button");

const filterPanel =
    getElement<HTMLElement>("#filter-panel");

if (
    !thumbnails ||
    !search ||
    !clearSearch ||
    !activeFilters ||
    !addTag ||
    !tagPanel ||
    !title ||
    !count ||
    !preview ||
    !source ||
    !reveal ||
    !filtersButton ||
    !filterPanel
) {
    throw new Error("Figure Gallery DOM is incomplete.");
}

/* ─────────────────────────────────────────────
   Lazy thumbnail loading
   ───────────────────────────────────────────── */

const thumbnailObserver =
    new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {

            entries.forEach((entry) => {

                if (!entry.isIntersecting) {
                    return;
                }

                const img =
                    entry.target as HTMLImageElement;

                if (img.dataset.loaded === "1") {
                    return;
                }

                const key = img.dataset.key;

                if (!key) {
                    return;
                }

                vscode.postMessage({
                    type: "requestThumbnail",
                    key,
                });

                thumbnailObserver.unobserve(img);
            });
        },
        {
            root: thumbnails,
            threshold: 0.05,
        }
    );


/* ─────────────────────────────────────────────
   Messages from extension
   ───────────────────────────────────────────── */

window.addEventListener(
    "message",
    (event: MessageEvent<GalleryWebviewMessage>) => {
        const message = event.data;

        if (message.type === "thumbnail") {
            const img =
                document.querySelector<HTMLImageElement>(
                    `img[data-key="${CSS.escape(message.key)}"]`
                );

            if (!img) {
                return;
            }

            img.src =
                "data:" +
                message.mimeType +
                ";base64," +
                message.data;

            img.dataset.loaded = "1";

            return;
        }

        if (message.type === "preview") {
            const img =
                document.querySelector<HTMLImageElement>(
                    "#preview-image"
                );

            if (!img) {
                return;
            }

            img.onload = () => {
                img.classList.add("loaded");
            };

            img.src =
                "data:" +
                message.mimeType +
                ";base64," +
                message.data;

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
    }
);

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

document
    .querySelectorAll<HTMLButtonElement>(".scope")
    .forEach((button) => {
        button.addEventListener("click", () => {
            const buttonScope = button.dataset.scope;

            if (
                buttonScope !== "notebook" &&
                buttonScope !== "all"
            ) {
                return;
            }

            vscode.postMessage({
                type: "setScope",
                scope: buttonScope,
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
    const target = event.target;

    if (!(target instanceof Node)) {
        return;
    }

    if (
        !filterPanel.contains(target) &&
        target !== filtersButton
    ) {
        filterPanel.classList.remove("open");
    }
});

document
    .querySelectorAll<HTMLButtonElement>(".filter-option")
    .forEach((button) => {
        button.addEventListener("click", () => {
            const filter = button.dataset.filter;

            if (
                filter !== "all" &&
                filter !== "titled" &&
                filter !== "untitled"
            ) {
                return;
            }

            titleFilter = filter;

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
    const target = event.target;

    if (!(target instanceof Node)) {
        return;
    }

    if (
        !tagPanel.contains(target) &&
        target !== addTag
    ) {
        tagPanel.classList.remove("open");
    }
});

function renderTagPanel(): void {
    const tags = Array.from(
        new Set(
            catalog.flatMap(
                (figure) => figure.tags || []
            )
        )
    ).sort((a, b) => a.localeCompare(b));

    if (tags.length === 0) {
        tagPanel.innerHTML =
            '<div class="tag-empty">No tags available</div>';

        return;
    }

    tagPanel.innerHTML = tags
        .map((tag) => {
            const active = activeTags.some(
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
                "</button>"
            );
        })
        .join("");

    tagPanel
        .querySelectorAll<HTMLButtonElement>(
            ".tag-option:not(:disabled)"
        )
        .forEach((button) => {
            button.addEventListener("click", () => {
                const tag = button.dataset.tag;

                if (tag) {
                    addTagFilter(tag);
                }
            });
        });
}

function getElement<T extends HTMLElement>(
    selector: string
): T {
    const element = document.querySelector<T>(selector);

    if (!element) {
        throw new Error(
            `Gallery element not found: ${selector}`
        );
    }

    return element;
}

function addTagFilter(tag: string): void {
    const normalized = tag.trim().toLowerCase();

    if (!normalized) {
        return;
    }

    const alreadyActive = activeTags.some(
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

function removeTagFilter(tag: string): void {
    activeTags = activeTags.filter(
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
        type: "revealCell",
    });
});


/* ─────────────────────────────────────────────
   Thumbnail selection
   ───────────────────────────────────────────── */

function selectThumbnail(key: string): void {
    selectedKey = key;

    document
        .querySelectorAll<HTMLButtonElement>(".thumbnail")
        .forEach((button) => {
            button.classList.toggle(
                "selected",
                button.dataset.key === key
            );
        });

    vscode.postMessage({
        type: "selectFigure",
        key,
    });

    updatePreview();
}

function selectAdjacentFigure(
    direction: "left" | "right" | "up" | "down"
): void {
    const results = filteredCatalog();

    if (results.length === 0) {
        return;
    }

    const currentIndex = results.findIndex(
        (figure) => figure.key === selectedKey
    );

    if (currentIndex === -1) {
        selectThumbnail(results[0].key);
        return;
    }

    const thumbnailButtons =
        Array.from(
            thumbnails.querySelectorAll<HTMLButtonElement>(
                ".thumbnail"
            )
        );

    const currentButton = thumbnailButtons.find(
        (button) =>
            button.dataset.key === selectedKey
    );

    if (!currentButton) {
        return;
    }

    /*
     * Determine the number of columns from the
     * actual rendered thumbnail positions.
     *
     * Buttons in the same row have the same offsetTop.
     */
    const currentTop = currentButton.offsetTop;

    const rowLength = thumbnailButtons.filter(
        (button) =>
            button.offsetTop === currentTop
    ).length;

    let nextIndex: number;

    switch (direction) {
        case "left":
            nextIndex = currentIndex - 1;
            break;

        case "right":
            nextIndex = currentIndex + 1;
            break;

        case "up":
            nextIndex = currentIndex - rowLength;
            break;

        case "down":
            nextIndex = currentIndex + rowLength;
            break;
    }

    /*
     * Don't wrap between rows.
     *
     * Left on the first item stays there.
     * Right on the last item stays there.
     * Up/down stay put when there is no corresponding row.
     */
    if (
        nextIndex < 0 ||
        nextIndex >= results.length
    ) {
        return;
    }

    const nextFigure = results[nextIndex];

    if (!nextFigure) {
        return;
    }

    selectThumbnail(nextFigure.key);

    const button =
        thumbnails.querySelector<HTMLButtonElement>(
            `.thumbnail[data-key="${CSS.escape(nextFigure.key)}"]`
        );

    button?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
    });
}

/* ─────────────────────────────────────────────
   Keyboard navigation
   ───────────────────────────────────────────── */

document.addEventListener("keydown", (event) => {
    const target = event.target;

    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement &&
            target.isContentEditable)
    ) {
        return;
    }

    switch (event.key) {
        case "ArrowLeft":
            event.preventDefault();
            selectAdjacentFigure("left");
            break;

        case "ArrowRight":
            event.preventDefault();
            selectAdjacentFigure("right");
            break;

        case "ArrowUp":
            event.preventDefault();
            selectAdjacentFigure("up");
            break;

        case "ArrowDown":
            event.preventDefault();
            selectAdjacentFigure("down");
            break;
    }
});

/* ─────────────────────────────────────────────
   Preview
   ───────────────────────────────────────────── */

function updatePreview(): void {
    const selected = catalog.find(
        (figure) => figure.key === selectedKey
    );

    if (!selected) {
        preview.innerHTML =
            '<p class="empty">' +
            "No figures match the current search." +
            "</p>";

        source.innerHTML = "";
        reveal.disabled = true;

        return;
    }

    const figureTitle =
        selected.title ||
        "Figure " + selected.number;

    const tags = selected.tags || [];

    const tagHtml =
        tags.length > 0
            ? '<div class="tags">' +
              tags
                  .map(
                      (tag) =>
                          '<span class="tag" data-tag="' +
                          escapeHtml(tag) +
                          '">' +
                          escapeHtml(tag) +
                          "</span>"
                  )
                  .join("") +
              "</div>"
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
        .querySelectorAll<HTMLElement>(".tag")
        .forEach((tagElement) => {
            tagElement.addEventListener("click", () => {
                const tag = tagElement.dataset.tag;

                if (tag) {
                    addTagFilter(tag);
                }
            });
        });

    vscode.postMessage({
        type: "requestPreview",
        key: selected.key,
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

function render(): void {
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
                key: selectedKey,
            });
        }
    }

    document
        .querySelectorAll<HTMLButtonElement>(".scope")
        .forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.scope === scope
            );
        });

    document
        .querySelectorAll<HTMLButtonElement>(
            ".filter-option"
        )
        .forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.filter === titleFilter
            );
        });

    filtersButton.classList.toggle(
        "active",
        titleFilter !== "all"
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

    thumbnails.innerHTML = results
        .map((figure) => {
            const figureTitle =
                figure.title ||
                "Figure " + figure.number;

            const label =
                scope === "all"
                    ? figureTitle +
                      " · " +
                      figure.notebookName
                    : figureTitle;

            return (
                '<button class="thumbnail' +
                (figure.key === selectedKey
                    ? " selected"
                    : "") +
                '" data-key="' +
                escapeHtml(figure.key) +
                '">' +
                '<img class="lazy" ' +
                'data-key="' +
                escapeHtml(figure.key) +
                '" ' +
                'src="" ' +
                'alt="thumbnail">' +
                "<span>" +
                escapeHtml(label) +
                "</span>" +
                "</button>"
            );
        })
        .join("");

    thumbnails
        .querySelectorAll<HTMLButtonElement>(".thumbnail")
        .forEach((button) => {
            button.addEventListener("click", () => {
                const key = button.dataset.key;

                if (key) {
                    selectThumbnail(key);
                }
            });

            button.addEventListener("dblclick", () => {
                const key = button.dataset.key;

                if (!key) {
                    return;
                }

                selectThumbnail(key);

                vscode.postMessage({
                    type: "revealCell",
                });
            });
        });

    thumbnails
        .querySelectorAll<HTMLImageElement>(
            ".thumbnail img"
        )
        .forEach((img) => {
            thumbnailObserver.observe(img);
        });

    updateSearchUI();
    updatePreview();
}

/* ─────────────────────────────────────────────
   Search UI
   ───────────────────────────────────────────── */

function updateSearchUI(): void {
    const query = search.value.trim();

    clearSearch.classList.toggle(
        "visible",
        query.length > 0
    );

    activeFilters.innerHTML = "";

    let hasFilters = false;

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
            label =
                "Tag: " +
                tagMatch[1].trim();
        } else if (titleMatch) {
            label =
                "Title: " +
                titleMatch[1].trim();
        } else if (cellMatch) {
            label =
                "Cell: " +
                cellMatch[1].trim();
        } else if (figureMatch) {
            label =
                "Figure: " +
                figureMatch[1].trim();
        } else if (codeMatch) {
            label =
                "Code: " +
                codeMatch[1].trim();
        }

        if (label) {
            appendFilterChip(label, () => {
                search.value = "";
                updateSearchUI();
                render();
                search.focus();
            });

            hasFilters = true;
        }
    }

    activeTags.forEach((tag) => {
        appendFilterChip(tag, () => {
            removeTagFilter(tag);
        });

        hasFilters = true;
    });

    activeFilters.classList.toggle(
        "visible",
        hasFilters
    );
}

function appendFilterChip(
    label: string,
    onRemove: () => void
): void {
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

function filteredCatalog(): GalleryFigure[] {
    const query =
        search.value.trim().toLowerCase();

    return catalog.filter((figure) => {
        const isTitled =
            Boolean(figure.title);

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

        return (
            code
                .toLowerCase()
                .includes(query) ||
            tags
                .toLowerCase()
                .includes(query) ||
            title
                .toLowerCase()
                .includes(query) ||
            cell === query ||
            number === query
        );
    });
}

/* ─────────────────────────────────────────────
   HTML escaping
   ───────────────────────────────────────────── */

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}