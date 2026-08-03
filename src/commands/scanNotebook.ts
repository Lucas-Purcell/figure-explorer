import * as vscode from "vscode";
import { scanNotebookFile } from "../notebook/scanner";
import { figureRegistry } from "../registry/figureRegistry";
import { FigureTreeProvider } from "../views/figureTreeProvider";

export async function scanNotebookCommand(provider: FigureTreeProvider): Promise<void> {
    const selected = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { "Jupyter Notebook": ["ipynb"] },
        openLabel: "Scan Notebook",
    });

    const uri = selected?.[0];
    if (!uri) {
        return;
    }

    try {
        const figures = await scanNotebookFile(uri);
        figureRegistry.setNotebook(uri, figures);
        provider.refresh();
        vscode.window.showInformationMessage(
            `Figure Explorer found ${figures.length} figure${figures.length === 1 ? "" : "s"}.`
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Could not scan notebook: ${message}`);
    }
}