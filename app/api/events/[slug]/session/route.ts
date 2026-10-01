import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        // Corpo opcional: se vier vazio, request.json() lançaria erro.
        const body = await request.json().catch(() => ({}));
        const nomeConvidado =
            typeof body?.nomeConvidado === "string"
                ? body.nomeConvidado.trim().slice(0, 80)
                : "";

        const event = await prisma.event.findUnique({
            where: { slugPublico: slug },
        });

        if (!event) {
            return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
        }

        if (event.status !== "live") {
            return NextResponse.json(
                { error: "Este evento não está aceitando acessos no momento" },
                { status: 403 }
            );
        }

        const guestSession = await prisma.guestSession.create({
            data: {
                eventId: event.id,
                nomeConvidado: nomeConvidado || null,
                tokenSessao: randomUUID(),
            },
        });

        return NextResponse.json(
            {
                tokenSessao: guestSession.tokenSessao,
                eventId: guestSession.eventId,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao criar sessão" }, { status: 500 });
    }
}