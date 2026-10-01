import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST( request: NextRequest) {
    try {
        const body = await request.json();
        const {email, senha } = body;

        if (!email || !senha) {
            return NextResponse.json(
                { error: "email e senha são obrigatorios"},
                { status: 400}
            );
        }
        const couple = await prisma.couple.findUnique({
            where: { email},
        });

        if (!couple) {
            return NextResponse.json(
                {error: "email ou senha incorretos"},
                { status: 401 }
            );
        }
         const senhaValida = await bcrypt.compare(senha, couple.senhaHash);

        if (!senhaValida) {
            return NextResponse.json(
                { error: "email ou senha incorretos"},
                { status: 401}
            );
        }
        const token = jwt.sign(
            { coupleId: couple.id, email: couple.email},
            process.env.JWT_SECRET as string,
            { expiresIn: "7d"}
        );

        return NextResponse.json(
            {
                token,
                couple: { id: couple.id, nome: couple.nome, email: couple.email},
            },
            { status: 200}
        );
    }   catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Erro ao fazer login"},
            { status: 500 }
        );
    }
}