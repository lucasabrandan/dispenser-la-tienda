// Comprime foto a JPEG ≤ 800px para que no pese mas de ~150KB
export async function comprimirFoto(file) {
    const MAX = file.size > 3_000_000 ? 700 : 900;
    const QUALITY = 0.78;

    if (typeof createImageBitmap !== 'undefined') {
        try {
            const bmp = await createImageBitmap(file, { resizeWidth: MAX, resizeQuality: 'medium' });
            const canvas = document.createElement('canvas');
            canvas.width  = bmp.width;
            canvas.height = bmp.height;
            canvas.getContext('2d').drawImage(bmp, 0, 0);
            bmp.close();
            return new Promise(resolve => {
                canvas.toBlob(
                    blob => resolve(blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file),
                    'image/jpeg', QUALITY
                );
            });
        } catch { /* fallback abajo */ }
    }

    return new Promise(resolve => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let w = img.naturalWidth || MAX, h = img.naturalHeight || MAX;
            if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                else       { w = Math.round(w * MAX / h); h = MAX; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            canvas.toBlob(
                blob => resolve(blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file),
                'image/jpeg', QUALITY
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}
