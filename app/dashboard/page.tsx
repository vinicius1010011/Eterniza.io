"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Evento {
    id: string;
    nomeEvento: string;
    slugPublico: string;
    status: string;
    criadoEm: string;
}

const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    live: "Em andamento",
    ended: "Encerrado",
    album_processing: "Gerando álbum",
    album_ready: "Álbum pronto",
};

export default function DashboardPage() {
    const router = useRouter();
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [nomeAnfitriao, setNomeAnfitriao] = useState("");
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const coupleRaw = localStorage.getItem("couple");

        if (!token) {
            router.push("/login");
            return;
        }

        if (coupleRaw) {
            const couple = JSON.parse(coupleRaw);
            setNomeAnfitriao(couple.nome);
        }

        fetch("/api/events", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setEventos(data);
                } else {
                    setErro(data.error || "Não foi possível carregar os eventos.");
                }
            })
            .catch(() => setErro("Não foi possível conectar ao servidor."))
            .finally(() => setCarregando(false));
    }, [router]);

    return (
        <main className="min-h-screen bg-background px-6 py-12">
            <div className="mx-auto max-w-2xl">
                <div className="mb-10 flex items-center justify-between border-b border-gold/40 pb-6">
                    <div>
                        <p className="font-logo text-2xl font-bold text-ink">Eterniza.io</p>
                        <p className="mt-1 text-sm text-ink/60">
                            {nomeAnfitriao ? `Olá, ${nomeAnfitriao}` : "Seus eventos"}
                        </p>
                    </div>
                    <a href="/dashboard/novo-evento" className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark">
                        Novo evento
                    </a>
                </div>

                {carregando && (
                    <p className="text-sm text-ink/60">Carregando seus eventos...</p>
                )}

                {erro && <p className="text-sm text-red-600">{erro}</p>}

                {!carregando && !erro && eventos.length === 0 && (
                    <div className="rounded-lg bg-surface p-8 text-center">
                        <p className="text-ink/70">
                            Você ainda não criou nenhum evento.
                        </p>
                        <a href="/dashboard/novo-evento" className="mt-4 inline-block text-navy hover:underline">
                            Criar meu primeiro evento
                        </a>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {eventos.map((evento) => (
                        <a key={evento.id} href={`/dashboard/eventos/${evento.slugPublico}`} className="flex items-center justify-between rounded-lg bg-surface p-5 transition-shadow hover:shadow-md">
                            <div>
                                <p className="font-display text-lg text-ink">
                                    {evento.nomeEvento}
                                </p>
                                <p className="mt-1 text-xs text-ink/50">
                                    {new Date(evento.criadoEm).toLocaleDateString("pt-BR")}
                                </p>
                            </div>
                            <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-medium text-navy">
                                {statusLabels[evento.status] || evento.status}
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </main>
    );
}