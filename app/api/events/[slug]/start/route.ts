import {NextRequest, NextResponse} from "next/server";
import {prisma} from "../../../../../lib/prisma";
import { getCoupleIdFromRequest }  from "../../../../../lib/auth";


export async function POST(
    request: NextRequest,
    {params}: {params: Promise<{slug: string}>}
)   {
    try{

        const coupleId = getCoupleIdFromRequest(request);

        if (!coupleId) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            );
        }

        const {slug} = await params;

        const event = await prisma.event.findUnique({
            where: {slugPublico: slug},
        });

        if (!event) {
            return NextResponse.json(
                {error: "Evento não encontrado"},
                {status: 404}
            );
        }

        if (event.coupleId !== coupleId) {
            return NextResponse.json(
                { error: "Você não tem permissão para iniciar este evento" },
                { status : 403}
            );
        }

        if (event.status !== "draft") {
            return NextResponse.json(
                { error: `Este evento não pode ser iniciado (status atual: ${event.status})`},
                { status: 400}
            );
        }
        const updatedEvent = await prisma.event.update({
            where: {id: event.id},
            data: { status: "live"},
        });
        return NextResponse.json(updatedEvent, {status: 200});
    }   catch (error) {
        console.error(error);
        return NextResponse.json(
            {error: "Erro ao iniciar evento"},
            { status: 500}
        );
    }
}