import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import { getCoupleIdFromRequest } from "../../../../lib/auth";

export async function PATCH(
    request: NextRequest,
    { params } : { params: Promise<{ id: string}>}
){
    try {
        const coupleId = getCoupleIdFromRequest(request);

        if (!coupleId) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        if ( status !== "approved"  && status !== "rejected") {
            return NextResponse.json(
                { error : "status deve ser 'approved' ou 'rejected' "},
                { status: 400}
            );
        }

        const mediaPost = await prisma.mediaPost.findUnique({
            where: { id },
            include: { event: true },
        });

        if (!mediaPost) {
            return NextResponse.json(
                { error: "Mídia não encontrada"},
                { status : 404 }
            );
        }

        if (mediaPost.event.coupleId !== coupleId) {
            return NextResponse.json(
                { error: "Você não tem permissão para moderar esta mídia" },
                { status: 403 }
            );
        }

        const updatedMediaPost = await prisma.mediaPost.update({
            where: { id },
            data: { status },
        });

        return NextResponse.json(updatedMediaPost, { status: 200 });
    }   catch (error) {
        console.error(error);
        return NextResponse.json(
            { error : "Erro ao atualizar mídia"},
            { status : 500 }
        );
    }

}