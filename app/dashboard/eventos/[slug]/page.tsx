"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

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
    }, [carregarEvento])

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
                            O evento foi encerrado. Em breve você poderá moderar as mídias e gerar o álbum aqui.
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
            </div>
        </main>
    );
}