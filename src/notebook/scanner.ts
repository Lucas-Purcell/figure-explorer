import * as vscode from "vscode";
import { FigureRecord } from "./types";
import { imageStore } from "../registry/imageStore";

const pngMimeType = "image/png";
const figureTitlePattern = /^\s*#\s*figure\s*:\s*(.+?)\s*$/i;
const figureTagsPattern = /^\s*#\s*tags\s*:\s*(.+?)\s*$/i;

export async function scanNotebookDocument(
    notebook: vscode.NotebookDocument
): Promise<FigureRecord[]> {
    console.log(
        "FIGURE EXPLORER SCANNER RUNNING:",
        notebook.uri.toString()
    );
    const figures: FigureRecord[] = [];
    const notebookName = fileName(notebook.uri);

    for (const [cellIndex, cell] of notebook.getCells().entries()) {

        const metadata = figureMetadata(
            cell.document.getText(),
            notebookName
        );

        console.log(
            "FIGURE METADATA:",
            metadata
        );

        for (const [outputIndex, output] of cell.outputs.entries()) {

            for (const [itemIndex, item] of output.items.entries()) {

                if (item.mime !== pngMimeType) {
                    continue;
                }

                const id = imageId(
                    notebook.uri,
                    cellIndex,
                    outputIndex,
                    itemIndex
                );
                // const thumbnail = await createThumbnail(item.data);

                imageStore.put(
                    id,
                    item.data
                );

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
            }
        }
    }

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
    
    for (const [cellIndex, cell] of (notebook.cells ?? []).entries()) {

        const metadata = figureMetadata(
            sourceText(cell.source),
            notebookName
        );

        for (const [outputIndex, output] of (cell.outputs ?? []).entries()) {

            const image = output.data?.[pngMimeType];

            if (!image) {
                continue;
            }

            const id = imageId(
                uri,
                cellIndex,
                outputIndex,
                0
            );

            const bytes = Buffer.from(
                Array.isArray(image) ? image.join("") : image,
                "base64"
            );

            // const thumbnail = await createThumbnail(bytes);

            imageStore.put(
                id,
                bytes,
            );

            figures.push({
                id,
                notebookUri: uri,
                notebookName,
                cellIndex,
                outputIndex,
                itemIndex: 0,
                mimeType: pngMimeType,
                ...metadata,
            });
        }
    }

    return figures;
}

function figureMetadata(
    source: string,
    notebookName: string
): Pick<
    FigureRecord,
    "title"
    | "tags"
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

    const tagsLine = lines.find((line: string) =>
        figureTagsPattern.test(line)
    );

    const tags = tagsLine
        ? tagsLine
            .match(figureTagsPattern)?.[1]
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean) ?? []
        : [];

    console.log(
        "Figure metadata:",
        {
            notebook: notebookName,
            title,
            tags,
            source,
        }
    );

    const snippetLines = lines
        .slice(title ? firstNonEmptyIndex + 1 : 0)
        .filter((line: string) => line.trim().length > 0)
        .slice(0, 4);

    const codeSnippet = snippetLines.join("\n") || "No code available.";

    return {
        ...(title ? { title } : {}),
        tags,
        codeSnippet,
        cellSource: source,
        searchText: [
            notebookName,
            title ?? "",
            tags.join(" "),
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

// async function createThumbnail(
//     bytes: Uint8Array
// ): Promise<Uint8Array> {

//     return await sharp(bytes)
//         .resize({
//             width: 160,
//             height: 160,
//             fit: "inside",
//         })
//         .png({
//             quality: 80,
//         })
//         .toBuffer();
// }
