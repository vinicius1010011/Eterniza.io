import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCoupleIdFromRequest } from "../../../../../lib/auth";
import { downloadFile } from "../../../../../lib/downloadFile";
import { generateAlbumVideo } from "../../../../../lib/generateAlbumVideo";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { fotoParaAlbum } from "@/lib/cloudinary";
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    let tempDir: string | null = null;

    try {
        const coupleId = getCoupleIdFromRequest(request);

        if (!coupleId) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            );
        }

        const { slug } = await params;

        const event = await prisma.event.findUnique({
            where: { slugPublico: slug },
        });

        if (!event) {
            return NextResponse.json(
                { error: "Evento não encontrado" },
                { status: 404 }
            );
        }

        if (event.coupleId !== coupleId) {
            return NextResponse.json(
                { error: "Você não tem permissão para gerar o álbum deste evento" },
                { status: 403 }
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

        tempDir = path.join(process.cwd(), "temp", `album-${event.id}`);
        fs.mkdirSync(tempDir, { recursive: true });

        const mediaFiles = [];

        for (let i = 0; i < mediaPosts.length; i++) {
            const post = mediaPosts[i];
            const extensao = post.tipo === "photo" ? "jpg" : "mp4";
            const localPath = path.join(tempDir, `original-${i}.${extensao}`);
            const url = post.tipo === "photo" ? fotoParaAlbum(post.storageUrl) : post.storageUrl;
            await downloadFile(url, localPath);

            mediaFiles.push({ filePath: localPath, tipo: post.tipo });
        }

        const outputPath = path.join(tempDir, "album-final.mp4");
        await generateAlbumVideo(mediaFiles, outputPath);

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

        const form = new FormData();
        form.append("file", fs.createReadStream(outputPath));
        form.append("upload_preset", uploadPreset as string);

        const uploadResponse = await axios.post(
            `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
            form,
            {
                headers: form.getHeaders(),
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        );

        const videoFinalUrl = uploadResponse.data.secure_url;

        const album = await prisma.album.create({
            data: {
                eventId: event.id,
                videoFinalUrl,
                status: "ready",
                finalizadoEm: new Date(),
            },
        });

        await prisma.event.update({
            where: { id: event.id },
            data: { status: "album_ready" },
        });

        fs.rmSync(tempDir, { recursive: true, force: true });

        return NextResponse.json(album, { status: 201 });
    } catch (error) {
        console.error(error);

        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }

        return NextResponse.json(
            { error: "Erro ao gerar álbum" },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const coupleId = getCoupleIdFromRequest(request);

        if (!coupleId) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            );
        }

        const { slug } = await params;

        const event = await prisma.event.findUnique({
            where: { slugPublico: slug },
            include: { album: true },
        });

        if (!event) {
            return NextResponse.json(
                { error: "Evento não encontrado" },
                { status: 404 }
            );
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

        return NextResponse.json(event.album, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Erro ao buscar álbum" },
            { status: 500 }
        );
    }
}