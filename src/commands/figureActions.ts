import * as vscode from "vscode";
import { PDFDocument } from "pdf-lib";
import { FigureRecord } from "../notebook/types";

export async function saveFigureAsPng(
    figure: FigureRecord
): Promise<void> {
    const target = await vscode.window.showSaveDialog({
        defaultUri: defaultUri(figure, "png"),
        filters: { "PNG image": ["png"] },
        saveLabel: "Save PNG",
    });

    if (!target) {
        return;
    }

    await vscode.workspace.fs.writeFile(
        target,
        Buffer.from(figure.data, "base64")
    );

    vscode.window.showInformationMessage("Figure saved as PNG.");
}

export async function exportFigureAsPdf(
    figure: FigureRecord
): Promise<void> {
    const target = await vscode.window.showSaveDialog({
        defaultUri: defaultUri(figure, "pdf"),
        filters: { "PDF document": ["pdf"] },
        saveLabel: "Export PDF",
    });

    if (!target) {
        return;
    }

    const pdf = await PDFDocument.create();
    const image = await pdf.embedPng(Buffer.from(figure.data, "base64"));

    const margin = 36;
    const pageWidth = 595.28;  // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const scale = Math.min(
        (pageWidth - margin * 2) / image.width,
        (pageHeight - margin * 2) / image.height,
        1
    );

    const width = image.width * scale;
    const height = image.height * scale;
    const page = pdf.addPage([pageWidth, pageHeight]);

    page.drawImage(image, {
        x: (pageWidth - width) / 2,
        y: (pageHeight - height) / 2,
        width,
        height,
    });

    await vscode.workspace.fs.writeFile(target, await pdf.save());

    vscode.window.showInformationMessage("Figure exported as PDF.");
}

function defaultUri(
    figure: FigureRecord,
    extension: string
): vscode.Uri | undefined {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!folder) {
        return undefined;
    }

    const notebook = figure.notebookName.replace(/\.ipynb$/i, "");
    const name = `${notebook}-cell-${figure.cellIndex + 1}.${extension}`;

    return vscode.Uri.joinPath(folder, name);
}