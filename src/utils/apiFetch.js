/**
 * Plain fetch with auth headers. No frontend caching - backend handles caching.
 */
export async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        Authorization: token ? `Bearer ${token}` : '',
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) return null;
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

const extractDownloadFilename = (contentDisposition, fallbackName) => {
    if (!contentDisposition) return fallbackName;

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]).replace(/^["']|["']$/g, '');
        } catch {
            return utf8Match[1].replace(/^["']|["']$/g, '');
        }
    }

    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    return filenameMatch?.[1] || fallbackName;
};

export async function apiDownload(url, { fallbackFileName = 'download' } = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        Authorization: token ? `Bearer ${token}` : '',
        'ngrok-skip-browser-warning': 'true',
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    const fileName = extractDownloadFilename(contentDisposition, fallbackFileName);

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}
