import * as vscode from "vscode";

export interface FigureRecord {
    id: string;
    notebookUri: vscode.Uri;
    notebookName: string;
    cellIndex: number;
    outputIndex: number;
    mimeType: string;
    data: string;
    title?: string;
    codeSnippet: string;
    cellSource: string;
}

export interface NotebookFigures {
    uri: vscode.Uri;
    name: string;
    figures: readonly FigureRecord[];
}