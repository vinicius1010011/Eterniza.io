import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

export interface MediaFile {
    filePath: string;
    tipo: "photo" | "video";
}

const LARGURA = 1280;
const ALTURA = 720;
const FPS = 30;
const SEGUNDOS_POR_FOTO = 3;
const SEGUNDOS_MAXIMOS_POR_VIDEO = 30;

// Todo clipe sai com o MESMO formato. É isso que permite juntar tudo
// depois com "-c copy". Formatos diferentes geravam vídeo sem áudio
// e com timestamps inválidos.
const FILTROS_VIDEO = [
    `scale=${LARGURA}:${ALTURA}:force_original_aspect_ratio=decrease`,
    `pad=${LARGURA}:${ALTURA}:(ow-iw)/2:(oh-ih)/2:color=black`,
    "setsar=1",
    `fps=${FPS}`,
    "format=yuv420p",
];

const CADEIA_VIDEO = FILTROS_VIDEO.join(",");

// Áudio silencioso gerado DENTRO do filtro (sem "-f lavfi" na entrada).
// A fluent-ffmpeg bloqueia qualquer "-f lavfi" por causa de um bug na leitura
// da lista de formatos dos FFmpeg novos; como filtro, isso não acontece.
const SILENCIO_FILTRO = "anullsrc=r=44100:cl=stereo";

export async function generateAlbumVideo(
    mediaFiles: MediaFile[],
    outputPath: string
): Promise<void> {
    const tempDir = path.dirname(outputPath);
    const clipes: string[] = [];

    for (let i = 0; i < mediaFiles.length; i++) {
        const media = mediaFiles[i];
        const clipePath = path.join(tempDir, `clip-${i}.mp4`);

        if (media.tipo === "photo") {
            await fotoParaClipe(media.filePath, clipePath);
        } else {
            await videoParaClipe(media.filePath, clipePath);
        }

        clipes.push(clipePath);
    }

    await concatenarClipes(clipes, outputPath, tempDir);
}

function executar(comando: ffmpeg.FfmpegCommand, saida: string): Promise<void> {
    return new Promise((resolve, reject) => {
        comando
            .on("end", () => resolve())
            .on("error", (err) => reject(err))
            .save(saida);
    });
}

function fotoParaClipe(imagePath: string, outputPath: string): Promise<void> {
    const comando = ffmpeg()
        .input(imagePath)
        .inputOptions(["-loop 1"])
        .outputOptions([
            "-filter_complex",
            `[0:v]${CADEIA_VIDEO}[v];${SILENCIO_FILTRO}[a]`,
            "-map",
            "[v]",
            "-map",
            "[a]",
            `-t ${SEGUNDOS_POR_FOTO}`,
            "-c:v libx264",
            "-c:a aac",
            "-b:a 128k",
            "-movflags +faststart",
        ]);

    return executar(comando, outputPath);
}

async function videoParaClipe(videoPath: string, outputPath: string): Promise<void> {
    const comAudio = await temAudio(videoPath);

    const comando = ffmpeg().input(videoPath);

    if (comAudio) {
        comando.videoFilters(FILTROS_VIDEO).outputOptions([
            `-t ${SEGUNDOS_MAXIMOS_POR_VIDEO}`,
            "-c:v libx264",
            "-c:a aac",
            "-ar 44100",
            "-ac 2",
            "-b:a 128k",
            "-movflags +faststart",
        ]);
    } else {
        // Vídeo sem áudio ganha silêncio, senão o concat final perde sincronismo.
        // O "-shortest" corta o silêncio (infinito) quando o vídeo termina.
        comando.outputOptions([
            "-filter_complex",
            `[0:v]${CADEIA_VIDEO}[v];${SILENCIO_FILTRO}[a]`,
            "-map",
            "[v]",
            "-map",
            "[a]",
            "-shortest",
            `-t ${SEGUNDOS_MAXIMOS_POR_VIDEO}`,
            "-c:v libx264",
            "-c:a aac",
            "-ar 44100",
            "-ac 2",
            "-b:a 128k",
            "-movflags +faststart",
        ]);
    }

    return executar(comando, outputPath);
}

function temAudio(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, data) => {
            if (err) return reject(err);
            resolve(data.streams.some((s) => s.codec_type === "audio"));
        });
    });
}

function concatenarClipes(clipPaths: string[], outputPath: string, tempDir: string): Promise<void> {
    const listFilePath = path.join(tempDir, "lista-concat.txt");

    // Caminhos relativos à pasta da lista: evita problemas com "\" no Windows
    const conteudo = clipPaths
        .map((clipPath) => `file '${path.basename(clipPath)}'`)
        .join("\n");

    fs.writeFileSync(listFilePath, conteudo);

    const comando = ffmpeg()
        .input(listFilePath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy", "-movflags +faststart"]);

    return executar(comando, outputPath);
}