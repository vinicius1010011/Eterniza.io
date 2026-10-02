type Tipo = "photo" | "video";

export function urlCloudinaryValida(
    url: unknown,
    cloudName: string | undefined,
    tipo: Tipo
):  url is string {
        if (typeof url !== "string" || !cloudName) return false;

        try {
            const u = new URL (url);
            const recurso = tipo === "photo" ? "image" : "video";
            return (
                u.protocol === "https:" &&
                u.hostname === "res.cloudinary.com" &&
                u.pathname.startsWith(`/${cloudName}/${recurso}/upload/`)
            );
        } catch {
            return false;
        }
}

function comTransformacao(url: string, transformacao: string): string {
    return url.replace("/upload/", `/upload/${transformacao}/`);
}

export function fotoParaAlbum(url: string): string{
    return comTransformacao(url, "f_jpg,w_1920,c_limit").replace(/\.[a-z0-9]+$/i, ".jpg");
}

export function miniaturaFoto(url: string): string{
    return comTransformacao(url,"c_fill,w_480,h_480,q_auto").replace(/\.[a-z0-9]+$/i,".jpg");
}

export function miniaturaVideo(url:string): string {
    return comTransformacao(url,"so_0,c_fill,w_480,h_480,q_auto").replace(/\.[a-z0-9]+$/i,".jpg");
}
