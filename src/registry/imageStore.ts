import * as vscode from "vscode";

interface StoredImage {
    full: Readonly<Uint8Array>;
    thumbnail: Readonly<Uint8Array>;
}

export class ImageStore {
    private readonly cache = new Map<string, StoredImage>();

    put(
        id: string,
        full: Uint8Array,
        thumbnail: Uint8Array
    ): void {
        this.cache.set(id, {
            full,
            thumbnail,
        });
    }

    get(id: string): Readonly<Uint8Array> | undefined {
        return this.cache.get(id)?.full;
    }

    getThumbnail(id: string): Readonly<Uint8Array> | undefined {
        return this.cache.get(id)?.thumbnail;
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
        const bytes = this.get(id);

        if (!bytes) {
            return undefined;
        }

        return Buffer.from(bytes).toString("base64");
    }

    getThumbnailBase64(id: string): string | undefined {
        const bytes = this.getThumbnail(id);

        if (!bytes) {
            return undefined;
        }

        return Buffer.from(bytes).toString("base64");
    }
}

export const imageStore = new ImageStore();