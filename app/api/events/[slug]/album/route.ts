import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { getCoupleIdFromRequest } from "@/lib/auth";
import { fotoParaAlbum } from "@/lib/cloudinary";

// Tempo máximo desta função na Vercel (dá folga caso o serviço de vídeo esteja "dormindo")
export const maxDuration = 60;

// Se o álbum ficar "gerando" por mais que isso, consideramos que falhou
const MINUTOS_LIMITE_GERACAO = 20;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const coupleId = getCoupleIdFromRequest(request);

        if (!coupleId) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const { slug } = await params;

        const event = await prisma.event.findUnique({
            where: { slugPublico: slug },
        });

        if (!event) {
            return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
        }

        if (event.coupleId !== coupleId) {
            return NextResponse.json(
                { error: "Você não tem permissão para gerar o álbum deste evento" },
                { status: 403 }
            );
        }

        if (event.status === "album_processing") {
            return NextResponse.json(
                { error: "O álbum já está sendo gerado. Aguarde." },
                { status: 400 }
            );
        }

        if (event.status !== "ended") {
            return NextResponse.json(
                { error: `O evento precisa estar encerrado para gerar o álbum (status atual: ${event.status})` },
                { status: 400 }
            );
        }

        const mediaPosts = await prisma.mediaPost.findMany({
            where: { eventId: event.id, status: "approved" },
            orderBy: { criadoEm: "asc" },
        });

        if (mediaPosts.length === 0) {
            return NextResponse.json(
                { error: "Não há mídias aprovadas para gerar o álbum" },
                { status: 400 }
            );
        }

        const workerUrl = process.env.WORKER_URL;
        const workerSecret = process.env.WORKER_SECRET;
        const appUrl = process.env.APP_URL;

        if (!workerUrl || !workerSecret || !appUrl) {
            console.error("Faltam variáveis de ambiente: WORKER_URL, WORKER_SECRET ou APP_URL");
            return NextResponse.json(
                { error: "Serviço de vídeo não configurado" },
                { status: 500 }
            );
        }

        // Marca como "gerando" ANTES de chamar o serviço de vídeo.
        // upsert: cria o álbum na primeira vez e reaproveita em novas tentativas.
        await prisma.album.upsert({
            where: { eventId: event.id },
            create: { eventId: event.id, status: "processing" },
            update: {
                status: "processing",
                erro: null,
                videoFinalUrl: null,
                finalizadoEm: null,
                criadoEm: new Date(),
            },
        });

        await prisma.event.update({
            where: { id: event.id },
            data: { status: "album_processing" },
        });

        const media = mediaPosts.map((post) => ({
            tipo: post.tipo,
            url: post.tipo === "photo" ? fotoParaAlbum(post.storageUrl) : post.storageUrl,
        }));

        try {
            await axios.post(
                `${workerUrl}/generate`,
                {
                    eventId: event.id,
                    callbackUrl: `${appUrl}/api/internal/album-callback`,
                    media,
                },
                {
                    headers: { "x-worker-secret": workerSecret },
                    timeout: 55_000,
                }
            );
        } catch (error) {
            console.error("Falha ao acionar o serviço de vídeo:", error);

            await prisma.album.update({
                where: { eventId: event.id },
                data: { status: "error", erro: "Não foi possível acionar o serviço de vídeo." },
            });
            await prisma.event.update({
                where: { id: event.id },
                data: { status: "ended" },
            });

            return NextResponse.json(
                { error: "Não foi possível iniciar a geração do álbum. Tente novamente em instantes." },
                { status: 502 }
            );
        }

        return NextResponse.json({ status: "processing" }, { status: 202 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao gerar álbum" }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const coupleId = getCoupleIdFromRequest(request);

        if (!coupleId) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const { slug } = await params;

        const event = await prisma.event.findUnique({
            where: { slugPublico: slug },
            include: { album: true },
        });

        if (!event) {
            return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
        }

        if (event.coupleId !== coupleId) {
            return NextResponse.json(
                { error: "Você não tem permissão para ver este álbum" },
                { status: 403 }
            );
        }

        if (!event.album) {
            return NextResponse.json(
                { error: "Álbum ainda não foi gerado para este evento" },
                { status: 404 }
            );
        }

        let album = event.album;

        // Proteção: se travou (ex.: o serviço de vídeo caiu no meio), libera nova tentativa.
        if (event.status === "album_processing" && album.status === "processing") {
            const minutos = (Date.now() - album.criadoEm.getTime()) / 60000;

            if (minutos > MINUTOS_LIMITE_GERACAO) {
                album = await prisma.album.update({
                    where: { eventId: event.id },
                    data: { status: "error", erro: "A geração demorou demais. Tente novamente." },
                });
                await prisma.event.update({
                    where: { id: event.id },
                    data: { status: "ended" },
                });
            }
        }

        return NextResponse.json(album, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao buscar álbum" }, { status: 500 });
    }
}

