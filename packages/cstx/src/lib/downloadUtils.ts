/**
 * Browser download helpers.
 *
 * All functions target a browser environment (DOM + Blob API).
 */

export const triggerBlobDownload = (blob: Blob, filename: string): void => {
    const urlApi = [globalThis.window?.URL, globalThis.URL].find(
        (candidate): candidate is typeof URL =>
            Boolean(candidate)
            && typeof candidate.createObjectURL === 'function'
            && typeof candidate.revokeObjectURL === 'function',
    );
    if (!urlApi) {
        throw new Error('Blob downloads are not supported in this environment');
    }
    const downloadUrl = urlApi.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    if (typeof anchor.remove === 'function') {
        anchor.remove();
    } else {
        document.body.removeChild(anchor);
    }
    urlApi.revokeObjectURL(downloadUrl);
};

export const downloadText = (filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void => {
    triggerBlobDownload(new Blob([content], {type: mimeType}), filename);
};

export const encodeCsvValue = (value: unknown): string => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const rowsToCsv = (rows: unknown[][]): string =>
    rows.map(row => row.map(encodeCsvValue).join(',')).join('\n');

export const downloadJson = (filename: string, data: unknown): void => {
    downloadText(filename, JSON.stringify(data, null, 2), 'application/json');
};

// 从 Content-Disposition 头里抽文件名。后端 (mapping) 用 RFC 5987 的
// `filename*=UTF-8''…` 形式编码中文文件名，所以优先级 UTF-8 > quoted > plain。
// fallback 用于 header 缺失或 UA 不发的兜底。
export const resolveDownloadFilename = (
    contentDisposition: string | null,
    fallback: string,
): string => {
    if (!contentDisposition) {
        return fallback;
    }

    const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            return utf8Match[1];
        }
    }

    const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
    if (quotedMatch?.[1]) {
        return quotedMatch[1];
    }

    const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
    if (plainMatch?.[1]) {
        return plainMatch[1].trim();
    }

    return fallback;
};
