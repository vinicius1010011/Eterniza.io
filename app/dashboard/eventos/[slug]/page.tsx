"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { miniaturaFoto, miniaturaVideo } from "@/lib/cloudinary";
interface Evento {
    id: string;
    nomeEvento: string;
    dataCasamento: string | null;
    slugPublico: string;
    status: string;
    moderacaoAtiva: boolean;
}

const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    live: "Em andamento",
    ended: "Encerrado",
    album_processing: "Gerando álbum",
    album_ready: "Álbum pronto",
};

interface Midia {
    id: string;
    tipo: "photo" | "video";
    storageUrl: string;
    thumbnailUrl: string | null;
    musicaTitulo: string | null;
    musicaArtista: string | null;
    mensagemTexto: string | null;
    status: "pending" | "approved" | "rejected";
    criadoEm: string;
}

type AbaStatus = "pending" | "approved" | "rejected";

interface Album {
    id: string;
    videoFinalUrl: string | null;
    status: string;
}

const abasLabels: Record<AbaStatus, string> = {
    pending: "Pendentes",
    approved: "Aprovadas",
    rejected: "Rejeitadas",
};

export default function PainelEventoPage() {
    const router = useRouter();
    const params = useParams<{ slug: string }>();
    const slug = params.slug;

    const [evento, setEvento] = useState<Evento | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [acaoEmAndamento, setAcaoEmAndamento] = useState(false);
    const [linkCopiado, setLinkCopiado] = useState(false);

    const carregarEvento = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const res = await fetch("/api/events", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("couple");
                router.push("/login");
                return;
            }

            const data = await res.json();

            if (!Array.isArray(data)) {
                setErro(data.error || "Não foi possível carregar o evento.");
                return;
            }

            const encontrado = data.find((e: Evento) => e.slugPublico === slug);
            if (!encontrado) {
                setErro("Evento não encontrado.");
                return;
            }

            setEvento(encontrado);
        } catch {
            setErro("Não foi possível conectar ao servidor.");
        } finally {
            setCarregando(false);
        }
    }, [router, slug]);

    useEffect(() => {
        carregarEvento();
    }, [carregarEvento]);

    // ---- Moderação (hooks precisam ficar antes dos returns condicionais) ----
    const [aba, setAba] = useState<AbaStatus>("pending");
    const [midias, setMidias] = useState<Midia[]>([]);
    const [carregandoMidias, setCarregandoMidias] = useState(false);
    const [erroMidias, setErroMidias] = useState<string | null>(null);
    const [moderandoId, setModerandoId] = useState<string | null>(null);

    const statusEvento = evento?.status;

    const carregarMidias = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        setCarregandoMidias(true);
        setErroMidias(null);
        try {
            const res = await fetch(`/api/events/${slug}/media?status=${aba}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("couple");
                router.push("/login");
                return;
            }

            const data = await res.json();

            if (!Array.isArray(data)) {
                setErroMidias(data.error || "Não foi possível carregar as mídias.");
                return;
            }

            setMidias(data);
        } catch {
            setErroMidias("Não foi possível conectar ao servidor.");
        } finally {
            setCarregandoMidias(false);
        }
    }, [router, slug, aba]);

    useEffect(() => {
        if (statusEvento === "live" || statusEvento === "ended") {
            carregarMidias();
        }
    }, [statusEvento, carregarMidias]);

    const [album, setAlbum] = useState<Album | null>(null);
    const [gerandoAlbum, setGerandoAlbum] = useState(false);
    const [erroAlbum, setErroAlbum] = useState<string | null>(null);
    const [linkAlbumCopiado, setLinkAlbumCopiado] = useState(false);

    const carregarAlbum = useCallback(async () => {
        const token =localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const res = await fetch(`/api/events/${slug}/album`, {
                headers: { Authorization: `Bearer ${token}`},
            });

            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("couple");
                router.push("/login");
                return;
            }

            const data = await res.json();

            if (!res.ok) {
                setErroAlbum(data.error || "Não foi possível carregar o álbum.");
                return;
            }

            setAlbum(data);
        } catch {
            setErroAlbum("Não foi possível conectar ao servidor.");
        }
    }, [router, slug]);

    useEffect(() => {
        if (statusEvento === "album_ready") {
            carregarAlbum();
        }
    }, [statusEvento, carregarAlbum]);

    async function gerarAlbum() {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const confirmou = window.confirm(
            "Gerar o álbum agora? Depois de gerado, não será possível alterar as mídias aprovadas."
        );
        if (!confirmou) return;

        setGerandoAlbum(true);
        setErroAlbum(null);
        try {
            const res = await fetch(`/api/events/${slug}/album`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("couple");
                router.push("/login");
                return;
            }

            if (!res.ok) {
                const data = await res.json();
                setErroAlbum(data.error || "Não foi possível gerar o álbum.");
                return;
            }

            await carregarEvento();
        } catch {
            setErroAlbum("Não foi possível conectar ao servidor.");
        } finally {
            setGerandoAlbum(false);
        }
    }

    async function copiarLinkAlbum() {
        if (!album?.videoFinalUrl) return;
        try {
            await navigator.clipboard.writeText(album.videoFinalUrl);
            setLinkAlbumCopiado(true);
            setTimeout(() => setLinkAlbumCopiado(false), 2000);
        } catch {
            setErroAlbum("Não foi possível copiar o link.");
        }
    }

    async function moderar(id: string, novoStatus: "approved" | "rejected") {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        setModerandoId(id);
        setErroMidias(null);
        try {
            const res = await fetch(`/api/media/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: novoStatus }),
            });

            if (!res.ok) {
                const data = await res.json();
                setErroMidias(data.error || "Não foi possível atualizar a mídia.");
                return;
            }

            setMidias((atual) => atual.filter((m) => m.id !== id));
        } catch {
            setErroMidias("Não foi possível conectar ao servidor.");
        } finally {
            setModerandoId(null);
        }
    }
    // ---- Fim da moderação ----

    async function mudarStatus(acao: "start" | "end") {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        if (acao === "end") {
            const confirmou = window.confirm(
                "Encerrar o evento? Os convidados não poderão mais enviar fotos e vídeos."
            );
            if (!confirmou) return;
        }

        setAcaoEmAndamento(true);
        setErro(null);
        try {
            const res = await fetch(`/api/events/${slug}/${acao}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const data = await res.json();
                setErro(data.error || "Não foi possível atualizar o evento.");
                return;
            }

            await carregarEvento();
        } catch {
            setErro("Não foi possível conectar ao servidor.");
        } finally {
            setAcaoEmAndamento(false);
        }
    }

    async function copiarLink() {
        const link = `${window.location.origin}/e/${slug}`;
        try {
            await navigator.clipboard.writeText(link);
            setLinkCopiado(true);
            setTimeout(() => setLinkCopiado(false), 2000);
        } catch {
            setErro("Não foi possível copiar. Selecione o link e copie manualmente.");
        }
    }

    if (carregando) {
        return (
            <main className="min-h-screen bg-background px-6 py-12">
                <p className="text-center text-sm text-ink/60">Carregando evento...</p>
            </main>
        );
    }

    if (!evento) {
        return (
            <main className="min-h-screen bg-background px-6 py-12">
                <div className="mx-auto max-w-2xl">
                    <p className="text-sm text-red-600">{erro || "Evento não encontrado."}</p>
                    <a href="/dashboard" className="mt-4 inline-block text-sm text-navy hover:underline">
                        Voltar para meus eventos
                    </a>
                </div>
            </main>
        );
    }

    const linkConvidados = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${evento.slugPublico}`;
    const urlDownloadAlbum = album?.videoFinalUrl
        ? album.videoFinalUrl.replace("/upload/", "/upload/fl_attachment/")
        : null;

    return (
        <main className="min-h-screen bg-background px-6 py-12">
            <div className="mx-auto max-w-2xl">
                <div className="mb-8 border-b border-gold/40 pb-6">
                    <p className="font-logo text-2xl font-bold text-ink">Eterniza.io</p>
                    <a href="/dashboard" className="mt-1 inline-block text-sm text-navy hover:underline">
                        Voltar para meus eventos
                    </a>
                </div>

                <div className="rounded-lg bg-surface p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="font-display text-2xl text-ink">{evento.nomeEvento}</h1>
                            {evento.dataCasamento && (
                                <p className="mt-1 text-sm text-ink/60">
                                    {new Date(evento.dataCasamento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                                </p>
                            )}
                        </div>
                        <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-medium text-navy">
                            {statusLabels[evento.status] || evento.status}
                        </span>
                    </div>

                    {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

                    {evento.status === "draft" && (
                        <div className="mt-6">
                            <p className="text-sm text-ink/70">
                                O evento ainda não começou. Inicie para liberar o envio de fotos e vídeos aos convidados.
                            </p>
                            <button
                                onClick={() => mudarStatus("start")}
                                disabled={acaoEmAndamento}
                                className="mt-3 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
                            >
                                {acaoEmAndamento ? "Iniciando..." : "Iniciar evento"}
                            </button>
                        </div>
                    )}

                    {evento.status === "live" && (
                        <div className="mt-6">
                            <p className="text-sm text-ink/70">
                                O evento está aberto. Compartilhe o link abaixo com os convidados.
                            </p>
                            <button
                                onClick={() => mudarStatus("end")}
                                disabled={acaoEmAndamento}
                                className="mt-3 rounded-md border border-navy px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy/10 disabled:opacity-60"
                            >
                                {acaoEmAndamento ? "Encerrando..." : "Encerrar evento"}
                            </button>
                        </div>
                    )}

                    {evento.status === "ended" && (
                        <p className="mt-6 text-sm text-ink/70">
                            O evento foi encerrado. Modere as mídias abaixo antes de gerar o álbum.
                        </p>
                    )}

                    {evento.status === "album_ready" && (
                        <p className="mt-6 text-sm text-ink/70">O álbum deste evento já foi gerado.</p>
                    )}
                </div>

                <div className="mt-6 rounded-lg bg-surface p-8">
                    <p className="text-sm text-ink/80">Link para os convidados</p>
                    <p className="mt-2 break-all rounded-md bg-background px-4 py-3 text-sm text-ink">
                        {linkConvidados}
                    </p>
                    <button
                        onClick={copiarLink}
                        className="mt-3 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark"
                    >
                        {linkCopiado ? "Link copiado!" : "Copiar link"}
                    </button>
                </div>

                {(evento.status === "live" || evento.status === "ended") && (
                    <div className="mt-6 rounded-lg bg-surface p-8">
                        <p className="font-display text-xl text-ink">Moderação</p>
                        <p className="mt-1 text-sm text-ink/60">
                            Só as mídias aprovadas entram no álbum.
                        </p>

                        <div className="mt-5 flex gap-2 border-b border-gold/40 pb-4">
                            {(Object.keys(abasLabels) as AbaStatus[]).map((chave) => (
                                <button
                                    key={chave}
                                    onClick={() => setAba(chave)}
                                    className={
                                        aba === chave
                                            ? "rounded-full bg-navy px-4 py-1.5 text-sm font-medium text-white"
                                            : "rounded-full bg-navy/10 px-4 py-1.5 text-sm font-medium text-navy hover:bg-navy/20"
                                    }
                                >
                                    {abasLabels[chave]}
                                </button>
                            ))}
                        </div>

                        {erroMidias && <p className="mt-4 text-sm text-red-600">{erroMidias}</p>}

                        {carregandoMidias && (
                            <p className="mt-4 text-sm text-ink/60">Carregando mídias...</p>
                        )}

                        {!carregandoMidias && !erroMidias && midias.length === 0 && (
                            <p className="mt-4 text-sm text-ink/60">Nenhuma mídia nesta aba.</p>
                        )}

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {midias.map((midia) => {
                                const miniatura =
                                    midia.thumbnailUrl ||
                                    (midia.tipo === "photo"
                                        ? miniaturaFoto(midia.storageUrl)
                                        : miniaturaVideo(midia.storageUrl));

                                return (
                                    <div key={midia.id} className="overflow-hidden rounded-lg bg-background">
                                        <img
                                            src={miniatura}
                                            alt="Mídia enviada por um convidado"
                                            className="aspect-square w-full object-cover"
                                        />
                                        <div className="p-3">
                                            <p className="text-xs font-medium text-navy">
                                                {midia.tipo === "photo" ? "Foto" : "Vídeo"}
                                                {midia.tipo === "video" && (
                                                    <a
                                                        href={midia.storageUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="ml-2 underline"
                                                    >
                                                        Assistir
                                                    </a>
                                                )}
                                            </p>

                                            {midia.mensagemTexto && (
                                                <p className="mt-2 text-sm text-ink">{midia.mensagemTexto}</p>
                                            )}

                                            {(midia.musicaTitulo || midia.musicaArtista) && (
                                                <p className="mt-1 text-xs text-ink/60">
                                                    {[midia.musicaTitulo, midia.musicaArtista].filter(Boolean).join(" - ")}
                                                </p>
                                            )}

                                            <div className="mt-3 flex gap-2">
                                                {midia.status !== "approved" && (
                                                    <button
                                                        onClick={() => moderar(midia.id, "approved")}
                                                        disabled={moderandoId === midia.id}
                                                        className="flex-1 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
                                                    >
                                                        Aprovar
                                                    </button>
                                                )}
                                                {midia.status !== "rejected" && (
                                                    <button
                                                        onClick={() => moderar(midia.id, "rejected")}
                                                        disabled={moderandoId === midia.id}
                                                        className="flex-1 rounded-md border border-navy px-3 py-1.5 text-sm font-medium text-navy transition-colors hover:bg-navy/10 disabled:opacity-60"
                                                    >
                                                        Rejeitar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {(evento.status === "ended" || evento.status === "album_ready") && (
                    <div className="mt-6 rounded-lg bg-surface p-8">
                        <p className="font-display text-xl text-ink">Álbum</p>

                        {erroAlbum && <p className="mt-4 text-sm text-red-600">{erroAlbum}</p>}

                        {evento.status === "ended" && (
                            <div className="mt-2">
                                <p className="text-sm text-ink/70">
                                    Quando terminar a moderação, gere o álbum com as mídias aprovadas.
                                </p>
                                {gerandoAlbum && (
                                    <p className="mt-3 text-sm text-ink/70">
                                        Gerando o álbum... Isso pode levar alguns minutos. Não feche nem recarregue esta página.
                                    </p>
                                )}
                                <button
                                    onClick={gerarAlbum}
                                    disabled={gerandoAlbum}
                                    className="mt-3 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
                                >
                                    {gerandoAlbum ? "Gerando..." : "Gerar álbum"}
                                </button>
                            </div>
                        )}

                        {evento.status === "album_ready" && !album && !erroAlbum && (
                            <p className="mt-4 text-sm text-ink/60">Carregando álbum...</p>
                        )}

                        {evento.status === "album_ready" && album?.videoFinalUrl && (
                            <div className="mt-4">
                                <video
                                    src={album.videoFinalUrl}
                                    controls
                                    className="w-full rounded-lg bg-black"
                                />
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <a
                                        href={urlDownloadAlbum ?? album.videoFinalUrl}
                                        className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark"
                                    >
                                        Baixar vídeo
                                    </a>
                                    <button
                                        onClick={copiarLinkAlbum}
                                        className="rounded-md border border-navy px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy/10"
                                    >
                                        {linkAlbumCopiado ? "Link copiado!" : "Copiar link do vídeo"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}