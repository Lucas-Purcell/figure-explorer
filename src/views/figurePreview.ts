import * as vscode from "vscode";
import { FigureRecord } from "../notebook/types";

export function openFigurePreview(figure: FigureRecord): void {
    const panel = vscode.window.createWebviewPanel(
        "figureExplorer.preview",
        `Figure — ${figure.notebookName}`,
        vscode.ViewColumn.Beside,
        {
            enableScripts: false,
        }
    );

    panel.webview.html = previewHtml(figure);
}

function previewHtml(figure: FigureRecord): string {
    const nonce = createNonce();
    const imageSource = `data:${figure.mimeType};base64,${figure.data}`;
    const title = escapeHtml(
        `${figure.notebookName} — Cell ${figure.cellIndex + 1}`
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}';"
    >
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style nonce="${nonce}">
        body {
            margin: 0;
            padding: 20px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            font-family: var(--vscode-font-family);
        }

        h1 {
            margin: 0 0 16px;
            font-size: 14px;
            font-weight: 600;
        }

        img {
            display: block;
            max-width: 100%;
            height: auto;
            margin: 0 auto;
            background: white;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <img src="${imageSource}" alt="${title}">
</body>
</html>`;
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
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}