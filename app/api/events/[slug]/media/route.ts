import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import { getCoupleIdFromRequest } from "../../../../../lib/auth";

export async function GET(
    request: NextRequest,
    {params} : {params: Promise<{slug: string}>}
) {
    try {
        const coupleId = getCoupleIdFromRequest(request);

        if (!coupleId) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            );
        }

        const {slug} = await params;

        const event = await prisma.event.findUnique({
            where: { slugPublico: slug},
        });

        if (!event) {
            return NextResponse.json(
                { error: "Evento não encontrado" },
                { status: 404}
            );
        }

        if (event.coupleId !== coupleId) {
            return NextResponse.json(
                { error: "Você não tem permissão para ver as mídias deste evento" },
                { status: 403 }
            );
        }

        const {searchParams} = new URL(request.url);
        const statusFiltro = searchParams.get("status");

        if (statusFiltro && !["pending", "approved", "rejected"].includes(statusFiltro)) {
            return NextResponse.json({ error: "status inválido" }, { status: 400 });
        }

        const mediaPosts = await prisma.mediaPost.findMany({
            where: {
                eventId: event.id,
                ...(statusFiltro? { status: statusFiltro as "pending" | "approved" | "rejected"}: {} ),
            },
            orderBy: {criadoEm: "asc"},
        });

        return NextResponse.json(mediaPosts, {status: 200});
    }   catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Erro ao buscar mídias"},
            { status: 500}
        );
    }
}