import {NextRequest, NextResponse} from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCoupleIdFromRequest } from "../../../lib/auth";

export async function POST (request: NextRequest) {
    try {
        const coupleId = getCoupleIdFromRequest (request);

        if (!coupleId){
            return NextResponse.json(
                { error : "Não autenticado"},
                { status : 401}
            );
        }

        const body = await request.json();
        const { nomeEvento, dataCasamento} = body;

        if (typeof nomeEvento !== "string" || !nomeEvento.trim()) {
            return NextResponse.json(
                { error: "O nome do evento é obrigatório" },
                { status: 400 }
            );
        }

        if (!dataCasamento || isNaN(new Date(dataCasamento).getTime())) {
            return NextResponse.json(
                { error: "A data do evento é obrigatória e precisa ser válida" },
                { status: 400 }
            );
        }

        const slugPublico = nomeEvento
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).substring(2, 7);

        const event = await prisma.event.create({
            data: {
                coupleId,
                nomeEvento,
                dataCasamento: new Date(dataCasamento),
                slugPublico,
            },
        });
        return NextResponse.json(event, {status: 201});
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            {error: "Erro ao criar evento"},
            {status: 500}
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const coupleId = getCoupleIdFromRequest(request);

        if (!coupleId) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            );
        }

        const events = await prisma.event.findMany({
            where: { coupleId },
            orderBy: { criadoEm: "desc" },
        });

        return NextResponse.json(events, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Erro ao buscar eventos" },
            { status: 500 }
        );
    }
}