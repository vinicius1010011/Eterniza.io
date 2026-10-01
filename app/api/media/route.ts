import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { urlCloudinaryValida } from "@/lib/cloudinary";

function texto(valor: unknown, max: number): string | null {
    if (typeof valor !== "string") return null;
    const limpo = valor.trim();
    return limpo ? limpo.slice(0, max) : null;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tokenSessao,
            tipo,
            storageUrl,
            storageKey,
            thumbnailUrl,
            musicaFonte,
            musicaTrackId,
            musicaTitulo,
            musicaArtista,
            musicaPreviewUrl,
            mensagemTexto,
        } = body;

        if (!tokenSessao || !tipo || !storageUrl || !storageKey) {
            return NextResponse.json(
                { error: "Campos obrigatórios faltando" },
                { status: 400 }
            );
        }

        if (tipo !== "photo" && tipo !== "video") {
            return NextResponse.json(
                { error: "tipo deve ser 'photo' ou 'video'" },
                { status: 400 }
            );
        }

        if (!urlCloudinaryValida(storageUrl, process.env.CLOUDINARY_CLOUD_NAME, tipo)) {
            return NextResponse.json({ error: "URL de arquivo inválida" }, { status: 400 });
        }

        const guestSession = await prisma.guestSession.findUnique({
            where: { tokenSessao },
            include: { event: true },
        });

        if (!guestSession) {
            return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
        }

        if (guestSession.event.status !== "live") {
            return NextResponse.json(
                { error: "Este evento não está mais aceitando envios" },
                { status: 403 }
            );
        }

        const mediaPost = await prisma.mediaPost.create({
            data: {
                eventId: guestSession.eventId,
                guestSessionId: guestSession.id,
                tipo,
                storageUrl,
                storageKey: String(storageKey).slice(0, 300),
                thumbnailUrl: texto(thumbnailUrl, 500),
                musicaFonte: texto(musicaFonte, 50),
                musicaTrackId: texto(musicaTrackId, 100),
                musicaTitulo: texto(musicaTitulo, 150),
                musicaArtista: texto(musicaArtista, 150),
                musicaPreviewUrl: texto(musicaPreviewUrl, 500),
                mensagemTexto: texto(mensagemTexto, 500),
                status: guestSession.event.moderacaoAtiva ? "pending" : "approved",
            },
        });

        return NextResponse.json(mediaPost, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao salvar mídia" }, { status: 500 });
    }
}