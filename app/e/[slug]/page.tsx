"use client";

import { useEffect, useState } from "react";

interface EventoPublico {
    id: string;
    nomeEvento: string;
    status: string;
    moderacaoAtiva: boolean;
    slugPublico: string;
}

export default function GuestPage({
                                      params,
                                  }: {
    params: Promise<{ slug: string }>;
}) {
    const [slug, setSlug] = useState<string>("");
    const [evento, setEvento] = useState<EventoPublico | null>(null);
    const [tokenSessao, setTokenSessao] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const [arquivo, setArquivo] = useState<File | null>(null);
    const [musicaTitulo, setMusicaTitulo] = useState("");
    const [musicaArtista, setMusicaArtista] = useState("");
    const [mensagemTexto, setMensagemTexto] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);

    useEffect(() => {
        async function iniciar() {
            const resolvedParams = await params;
            const slugAtual = resolvedParams.slug;
            setSlug(slugAtual);

            try {
                const resEvento = await fetch(`/api/events/${slugAtual}`);
                const dataEvento = await resEvento.json();

                if (!resEvento.ok) {
                    setErro(dataEvento.error || "Evento não encontrado.");
                    setCarregando(false);
                    return;
                }

                setEvento(dataEvento);

                if (dataEvento.status !== "live") {
                    setErro("Este evento não está aceitando envios no momento.");
                    setCarregando(false);
                    return;
                }

                const chaveStorage = `sessao_${slugAtual}`;
                const tokenSalvo = localStorage.getItem(chaveStorage);

                if (tokenSalvo) {
                    setTokenSessao(tokenSalvo);
                } else {
                    const resSessao = await fetch(`/api/events/${slugAtual}/session`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({}),
                    });
                    const dataSessao = await resSessao.json();

                    if (!resSessao.ok) {
                        setErro(dataSessao.error || "Não foi possível acessar o evento.");
                        setCarregando(false);
                        return;
                    }

                    localStorage.setItem(chaveStorage, dataSessao.tokenSessao);
                    setTokenSessao(dataSessao.tokenSessao);
                }
            } catch (err) {
                setErro("Não foi possível conectar ao servidor.");
            } finally {
                setCarregando(false);
            }
        }

        iniciar();
    }, [params]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!arquivo || !tokenSessao) return;

        setEnviando(true);
        setErro(null);

        try {
            const tipo = arquivo.type.startsWith("video") ? "video" : "photo";

            const formData = new FormData();
            formData.append("file", arquivo);
            formData.append(
                "upload_preset",
                process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string
            );

            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
            const resourceType = tipo === "video" ? "video" : "image";

            const uploadRes = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
                { method: "POST", body: formData }
            );
            const uploadData = await uploadRes.json();

            if (!uploadRes.ok) {
                setErro("Não foi possível enviar o arquivo.");
                setEnviando(false);
                return;
            }

            const confirmRes = await fetch("/api/media", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tokenSessao,
                    tipo,
                    storageUrl: uploadData.secure_url,
                    storageKey: uploadData.public_id,
                    musicaTitulo: musicaTitulo || null,
                    musicaArtista: musicaArtista || null,
                    mensagemTexto: mensagemTexto || null,
                }),
            });

            if (!confirmRes.ok) {
                const confirmData = await confirmRes.json();
                setErro(confirmData.error || "Não foi possível confirmar o envio.");
                setEnviando(false);
                return;
            }

            setEnviado(true);
            setArquivo(null);
            setMusicaTitulo("");
            setMusicaArtista("");
            setMensagemTexto("");
        } catch (err) {
            setErro("Não foi possível enviar. Tente novamente.");
        } finally {
            setEnviando(false);
        }
    }

    if (carregando) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background px-6">
                <p className="text-ink/60">Carregando...</p>
            </main>
        );
    }

    if (erro && !evento) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-background px-6">
                <p className="text-ink/70">{erro}</p>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
            <div className="w-full max-w-sm rounded-lg bg-surface p-8 shadow-sm">
                <div className="mb-6 border-b border-gold/40 pb-5 text-center">
                    <p className="font-logo text-2xl font-bold text-ink">
                        {evento?.nomeEvento}
                    </p>
                    <p className="mt-1 text-sm text-ink/60">
                        Compartilhe uma foto ou vídeo deste momento
                    </p>
                </div>

                {enviado ? (
                    <div className="text-center">
                        <p className="text-ink">Enviado com sucesso!</p>
                        <button
                            onClick={() => setEnviado(false)}
                            className="mt-4 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-dark"
                        >
                            Enviar outra foto/vídeo
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="arquivo" className="text-sm text-ink/80">
                                Foto ou vídeo
                            </label>
                            <input
                                id="arquivo"
                                type="file"
                                accept="image/*,video/*"
                                required
                                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                                className="text-sm text-ink/70"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="musicaTitulo" className="text-sm text-ink/80">
                                Música (opcional)
                            </label>
                            <input
                                id="musicaTitulo"
                                type="text"
                                value={musicaTitulo}
                                onChange={(e) => setMusicaTitulo(e.target.value)}
                                placeholder="Nome da música"
                                className="rounded-md border border-ink/15 bg-background px-3 py-2 text-sm text-ink outline-none focus:border-navy focus:ring-1 focus:ring-navy"
                            />
                            <input
                                type="text"
                                value={musicaArtista}
                                onChange={(e) => setMusicaArtista(e.target.value)}
                                placeholder="Artista"
                                className="rounded-md border border-ink/15 bg-background px-3 py-2 text-sm text-ink outline-none focus:border-navy focus:ring-1 focus:ring-navy"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="mensagem" className="text-sm text-ink/80">
                                Mensagem (opcional)
                            </label>
                            <textarea
                                id="mensagem"
                                value={mensagemTexto}
                                onChange={(e) => setMensagemTexto(e.target.value)}
                                placeholder="Deixe uma mensagem para os anfitriões"
                                rows={3}
                                className="rounded-md border border-ink/15 bg-background px-3 py-2 text-sm text-ink outline-none focus:border-navy focus:ring-1 focus:ring-navy"
                            />
                        </div>

                        {erro && <p className="text-sm text-red-600">{erro}</p>}

                        <button
                            type="submit"
                            disabled={enviando || !arquivo}
                            className="mt-2 rounded-md bg-navy px-4 py-2.5 font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
                        >
                            {enviando ? "Enviando..." : "Enviar"}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}