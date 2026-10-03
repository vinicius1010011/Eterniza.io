import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const segredo = process.env.WORKER_SECRET;

        if (!segredo || request.headers.get("x-worker-secret") !== segredo) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const { eventId, status, videoFinalUrl, erro } = body;

        if (typeof eventId !== "string" || (status !== "ready" && status !== "error")) {
            return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
        }

        const event = await prisma.event.findUnique({ where: { id: eventId } });

        // Só aceita o aviso se o evento realmente estava aguardando o álbum
        if (!event || event.status !== "album_processing") {
            return NextResponse.json({ ignorado: true }, { status: 200 });
        }

        if (status === "ready") {
            if (typeof videoFinalUrl !== "string" || !videoFinalUrl.startsWith("https://")) {
                return NextResponse.json({ error: "URL do vídeo inválida" }, { status: 400 });
            }

            await prisma.album.update({
                where: { eventId },
                data: {
                    status: "ready",
                    videoFinalUrl,
                    erro: null,
                    finalizadoEm: new Date(),
                },
            });

            await prisma.event.update({
                where: { id: eventId },
                data: { status: "album_ready" },
            });
        } else {
            await prisma.album.update({
                where: { eventId },
                data: {
                    status: "error",
                    erro: typeof erro === "string" ? erro.slice(0, 500) : "Erro ao gerar o álbum.",
                },
            });

            // Volta para "encerrado" para o anfitrião poder tentar de novo
            await prisma.event.update({
                where: { id: eventId },
                data: { status: "ended" },
            });
        }

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao processar aviso" }, { status: 500 });
    }
}