const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pipeline } = require("stream/promises");
const { generateAlbumVideo } = require("./generateAlbumVideo");

const PORT = process.env.PORT || 4000;
const WORKER_SECRET = process.env.WORKER_SECRET;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

if (!WORKER_SECRET || !CLOUD_NAME || !UPLOAD_PRESET) {
    console.error(
        "Faltam variáveis de ambiente: WORKER_SECRET, CLOUDINARY_CLOUD_NAME e CLOUDINARY_UPLOAD_PRESET."
    );
    process.exit(1);
}

const app = express();
app.use(express.json({ limit: "5mb" }));

// Fila: um álbum por vez, para não estourar a memória do servidor.
let fila = Promise.resolve();

app.get("/health", (req, res) => {
    res.json({ ok: true });
});

app.post("/generate", (req, res) => {
    if (req.get("x-worker-secret") !== WORKER_SECRET) {
        return res.status(401).json({ error: "Não autorizado" });
    }

    const { eventId, callbackUrl, media } = req.body || {};

    if (!eventId || !callbackUrl || !Array.isArray(media) || media.length === 0) {
        return res.status(400).json({ error: "Pedido inválido" });
    }

    // Responde na hora e trabalha em segundo plano.
    res.status(202).json({ ok: true });

    fila = fila.then(() => processarJob({ eventId, callbackUrl, media }));
});

async function processarJob({ eventId, callbackUrl, media }) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "album-"));
    console.log(`[${eventId}] Iniciando álbum com ${media.length} mídias`);

    try {
        const mediaFiles = [];

        for (let i = 0; i < media.length; i++) {
            const item = media[i];
            const extensao = item.tipo === "photo" ? "jpg" : "mp4";
            const localPath = path.join(tempDir, `original-${i}.${extensao}`);
            await baixarArquivo(item.url, localPath);
            mediaFiles.push({ filePath: localPath, tipo: item.tipo });
        }

        const outputPath = path.join(tempDir, "album-final.mp4");
        await generateAlbumVideo(mediaFiles, outputPath);

        const videoFinalUrl = await enviarParaCloudinary(outputPath);

        await avisarApp(callbackUrl, { eventId, status: "ready", videoFinalUrl });
        console.log(`[${eventId}] Álbum pronto`);
    } catch (error) {
        console.error(`[${eventId}] Erro ao gerar álbum:`, error);
        await avisarApp(callbackUrl, {
            eventId,
            status: "error",
            erro: "Erro ao gerar o álbum. Tente novamente.",
        });
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

async function baixarArquivo(url, destino) {
    const response = await axios.get(url, { responseType: "stream", timeout: 60_000 });
    await pipeline(response.data, fs.createWriteStream(destino));
}

async function enviarParaCloudinary(arquivo) {
    const form = new FormData();
    form.append("file", fs.createReadStream(arquivo));
    form.append("upload_preset", UPLOAD_PRESET);

    const resposta = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
        form,
        {
            headers: form.getHeaders(),
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        }
    );

    return resposta.data.secure_url;
}

// Avisa o app (Vercel) do resultado. Tenta até 3 vezes.
async function avisarApp(callbackUrl, payload) {
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
        try {
            await axios.post(callbackUrl, payload, {
                headers: { "x-worker-secret": WORKER_SECRET },
                timeout: 30_000,
            });
            return;
        } catch (error) {
            console.error(`Falha ao avisar o app (tentativa ${tentativa}):`, error.message);
            await new Promise((r) => setTimeout(r, 3000));
        }
    }
}

app.listen(PORT, () => {
    console.log(`Serviço de vídeo rodando na porta ${PORT}`);
});

