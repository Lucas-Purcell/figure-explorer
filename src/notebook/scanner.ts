import * as vscode from "vscode";
import { FigureRecord } from "./types";
import { imageStore } from "../registry/imageStore";

const pngMimeType = "image/png";
const figureTitlePattern = /^\s*#\s*figure\s*:\s*(.+?)\s*$/i;

export function scanNotebookDocument(
    notebook: vscode.NotebookDocument
): FigureRecord[] {
    const figures: FigureRecord[] = [];
    const notebookName = fileName(notebook.uri);

    notebook.getCells().forEach((cell, cellIndex) => {
        const metadata = figureMetadata(
            cell.document.getText(),
            notebookName
        );

        cell.outputs.forEach((output, outputIndex) => {
            output.items.forEach((item, itemIndex) => {

                if (item.mime !== pngMimeType) {
                    return;
                }

                const id = imageId(
                    notebook.uri,
                    cellIndex,
                    outputIndex,
                    itemIndex
                );

                imageStore.put(id, item.data);

                figures.push({
                    id,
                    notebookUri: notebook.uri,
                    notebookName,
                    cellIndex,
                    outputIndex,
                    itemIndex,
                    mimeType: item.mime,
                    ...metadata,
                });
            });
        });
    });

    return figures;
}

export async function scanNotebookFile(uri: vscode.Uri): Promise<FigureRecord[]> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const notebook = JSON.parse(new TextDecoder("utf-8").decode(bytes)) as {
        cells?: Array<{
            source?: string | string[];
            outputs?: Array<{ data?: Record<string, string | string[]> }>;
        }>;
    };
    const figures: FigureRecord[] = [];
    const notebookName = fileName(uri);
    
    notebook.cells?.forEach((cell, cellIndex) => {
        const metadata = figureMetadata(
            sourceText(cell.source),
            notebookName
        );

        cell.outputs?.forEach((output, outputIndex) => {
            const image = output.data?.[pngMimeType];
            if (!image) {
                return;
            }

            imageStore.put(
                imageId(uri, cellIndex, outputIndex, 0),
                Buffer.from(
                    Array.isArray(image) ? image.join("") : image,
                    "base64"
                )
            );

            figures.push({
                id: imageId(uri, cellIndex, outputIndex, 0),
                notebookUri: uri,
                notebookName,
                cellIndex,
                outputIndex,
                itemIndex: 0,
                mimeType: pngMimeType,
                ...metadata,
            });
        });
    });

    return figures;
}

function figureMetadata(
    source: string,
    notebookName: string
): Pick<
    FigureRecord,
    "title"
    | "codeSnippet"
    | "cellSource"
    | "searchText"
> {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const firstNonEmptyIndex = lines.findIndex(
        (line: string) => line.trim().length > 0
    );
    const firstLine =
        firstNonEmptyIndex >= 0 ? lines[firstNonEmptyIndex] : "";

    const title = firstLine.match(figureTitlePattern)?.[1].trim();

    const snippetLines = lines
        .slice(title ? firstNonEmptyIndex + 1 : 0)
        .filter((line: string) => line.trim().length > 0)
        .slice(0, 4);

    const codeSnippet = snippetLines.join("\n") || "No code available.";

    return {
        ...(title ? { title } : {}),
        codeSnippet,
        cellSource: source,
        searchText: [
            notebookName,
            title ?? "",
            codeSnippet,
            source,
        ]
        .join("\n")
        .toLowerCase()
    };
}

function sourceText(source: string | string[] | undefined): string {
    return Array.isArray(source) ? source.join("") : source ?? "";
}

function imageId(
    notebookUri: vscode.Uri,
    cellIndex: number,
    outputIndex: number,
    itemIndex: number
): string {
    return `${notebookUri.toString()}::${cellIndex}:${outputIndex}:${itemIndex}`;
}

function fileName(uri: vscode.Uri): string {
    return uri.path.split("/").pop() ?? uri.toString();
}