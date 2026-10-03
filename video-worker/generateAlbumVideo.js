const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const LARGURA = 1280;
const ALTURA = 720;
const FPS = 30;
const SEGUNDOS_POR_FOTO = 3;
const SEGUNDOS_MAXIMOS_POR_VIDEO = 30;


const FILTROS_VIDEO = [
    `scale=${LARGURA}:${ALTURA}:force_original_aspect_ratio=decrease`,
    `pad=${LARGURA}:${ALTURA}:(ow-iw)/2:(oh-ih)/2:color=black`,
    "setsar=1",
    `fps=${FPS}`,
    "format=yuv420p",
];

const CADEIA_VIDEO = FILTROS_VIDEO.join(",");


const SILENCIO_FILTRO = "anullsrc=r=44100:cl=stereo";

async function generateAlbumVideo(mediaFiles, outputPath) {
    const tempDir = path.dirname(outputPath);
    const clipes = [];

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

function executar(comando, saida) {
    return new Promise((resolve, reject) => {
        comando
            .on("end", () => resolve())
            .on("error", (err) => reject(err))
            .save(saida);
    });
}

function fotoParaClipe(imagePath, outputPath) {
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

async function videoParaClipe(videoPath, outputPath) {
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

function temAudio(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, data) => {
            if (err) return reject(err);
            resolve(data.streams.some((s) => s.codec_type === "audio"));
        });
    });
}

function concatenarClipes(clipPaths, outputPath, tempDir) {
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

module.exports = { generateAlbumVideo };

