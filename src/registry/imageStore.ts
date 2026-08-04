import * as vscode from "vscode";

export class ImageStore {
    private readonly cache = new Map<string, Readonly<Uint8Array>>();
    
    put(id: string, bytes: Uint8Array): void {
        this.cache.set(id, bytes);
    }

    has(id: string): boolean {
        return this.cache.has(id);
    }

    get(id: string): Readonly<Uint8Array> | undefined {
        return this.cache.get(id);
    }

    remove(id: string): void {
        this.cache.delete(id);
    }

    clear(): void {
        this.cache.clear();
    }

    clearNotebook(notebookUri: vscode.Uri): void {
        const prefix = `${notebookUri.toString()}::`;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    getBase64(id: string): string | undefined {
        const bytes = this.cache.get(id);
        if (!bytes) {
            return undefined;
        }
        return Buffer.from(bytes).toString("base64");
    }

}

export const imageStore = new ImageStore();