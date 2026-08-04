import * as vscode from "vscode";
import { PDFDocument } from "pdf-lib";
import { FigureRecord } from "../notebook/types";
import { imageStore } from "../registry/imageStore";

export async function saveFigureAsPng(
    figure: FigureRecord
): Promise<void> {

    const bytes = imageStore.get(figure.id);

    if (!bytes) {
        vscode.window.showErrorMessage(
            "Image data is no longer available."
        );
        return;
    }

    const target = await vscode.window.showSaveDialog({
        defaultUri: defaultUri(figure, "png"),
        filters: { "PNG image": ["png"] },
        saveLabel: "Save PNG",
    });

    if (!target) {
        return;
    }

    await vscode.workspace.fs.writeFile(target, bytes);

    vscode.window.showInformationMessage("Figure saved as PNG.");
}

export async function exportFigureAsPdf(
    figure: FigureRecord
): Promise<void> {

    const bytes = imageStore.get(figure.id);

    if (!bytes) {
        vscode.window.showErrorMessage(
            "Image data is no longer available."
        );
        return;
    }

    const target = await vscode.window.showSaveDialog({
        defaultUri: defaultUri(figure, "pdf"),
        filters: { "PDF document": ["pdf"] },
        saveLabel: "Export PDF",
    });

    if (!target) {
        return;
    }

    const pdf = await PDFDocument.create();

    const image = await pdf.embedPng(Buffer.from(bytes));

    const margin = 36;
    const pageWidth = 595.28;
    const pageHeight = 841.89;

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