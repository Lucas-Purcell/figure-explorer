import * as vscode from "vscode";
import { FigureRecord, NotebookFigures } from "../notebook/types";

class FigureRegistry {
    private readonly notebooks = new Map<string, NotebookFigures>();

    setNotebook(uri: vscode.Uri, figures: readonly FigureRecord[]): void {
        this.notebooks.set(uri.toString(), {
            uri,
            name: uri.path.split("/").pop() ?? uri.toString(),
            figures: [...figures],
        });
    }

    removeNotebook(uri: vscode.Uri): void {
        this.notebooks.delete(uri.toString());
    }

    getNotebook(uri: vscode.Uri): NotebookFigures | undefined {
        return this.notebooks.get(uri.toString());
    }

    getNotebooks(): readonly NotebookFigures[] {
        return [...this.notebooks.values()].sort((left, right) =>
            left.name.localeCompare(right.name)
        );
    }
}

export const figureRegistry = new FigureRegistry();