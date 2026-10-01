import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest){
    try {
        const body = await request.json();
        const { nome, email, senha } = body;

        if (!nome || !email || !senha) {
            return NextResponse.json(
                { error: "nome, email e senha são obrigatórios"},
                { status : 400}
            );
        }

        if (senha.length < 6) {
            return NextResponse.json(
                { error: "A senha precia ter pelomeos 6 caracteres"},
                { status: 400}
            );
        }
        const existingCouple = await prisma.couple.findUnique({
            where: { email },
        });

        if (existingCouple) {
            return NextResponse.json(
                { error: "Já existe uma conta com esse email"},
                { status: 409}
            );
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const couple = await prisma.couple.create({
            data: {
                nome,
                email,
                senhaHash,
            },
        });

        return NextResponse.json(
            { id: couple.id, nome: couple.nome, email: couple.email },
            { status : 201}
        );
    }   catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Erro ao criar conta"},
            { status: 500}
        );
    }
}