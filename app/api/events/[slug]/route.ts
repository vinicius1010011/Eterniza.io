import {NextRequest, NextResponse} from "next/server";
import {prisma} from "../../../../lib/prisma";

export async function GET(
    request: NextRequest,
    {params}: {params: Promise<{slug: string}> }
){
    try {
        const {slug} = await params;

        const event = await prisma.event.findUnique({
        where: {slugPublico: slug },
        select: {
            id: true,
            nomeEvento: true,
            status: true,
            moderacaoAtiva: true,
            slugPublico: true,
        },
    });
    if (!event) {
        return NextResponse.json(
            {error: "Evento não encontrado"},
            {status: 404}
        );
    }
    return NextResponse.json(event, {status: 200});
    }catch (error){
     console.error(error);
     return NextResponse.json(
         {error: "Error ao buscar evento"},
         {status: 500}
     );
    }
}