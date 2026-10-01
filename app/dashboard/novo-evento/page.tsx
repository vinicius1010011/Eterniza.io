"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NovoEventoPage() {
    const router = useRouter();
    const [nomeEvento, setNomeEvento] = useState("");
    const [dataEvento, setDataEvento] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
        }
    }, [router]);

    async function CriarEvento(e: React.FormEvent) {
        e.preventDefault();
        setErro(null);

        if (!nomeEvento.trim()) {
            setErro("Informe o nome do evento.");
            return;
        }
        if (!dataEvento){
            setErro("Informe a data do evento.")
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        setEnviando(true);
        try {
            const res = await fetch("/api/events",{
                method: "POST",
                headers: {
                    "Content-Type" : "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    nomeEvento: nomeEvento.trim(),
                    dataCasamento: dataEvento,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErro(data.error || "Não foi possível criar o evento.");
                return;
            }

            router.push(`/dashboard/eventos/${data.slugPublico}`);
        } catch {
            setErro("Não foi possível conectar o servidor.");
        } finally {
            setEnviando(false)
        }
    }
    return (
        <main className="min-h-screen bg-background px-6 py-12">
            <div className="mx-auto max-w-md">
                <div className="mb-8 border-b border-gold/40 pb-6">
                    <p className="font-logo text-2xl font-bold text-ink">Eterniza.io</p>
                    <p className="mt-1 text-sm text-ink/60">Criar novo evento</p>
                </div>

                <form onSubmit={CriarEvento} className="rounded-lg bg-surface p-8">
                    <label className="block text-sm text-ink/80">Nome do evento</label>
                    <input
                        type="text"
                        value={nomeEvento}
                        onChange={(e) => setNomeEvento(e.target.value)}
                        placeholder="Ex: Aniversário da Ana"
                        className="mt-2 w-full rounded-md bg-background px-4 py-3 text-ink outline-none"
                    />

                    <label className="mt-6 block text-sm text-ink/80">Data do evento</label>
                    <input
                        type="date"
                        value={dataEvento}
                        onChange={(e) => setDataEvento(e.target.value)}
                        className="mt-2 w-full rounded-md bg-background px-4 py-3 text-ink outline-none"
                    />

                    {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

                    <button
                        type="submit"
                        disabled={enviando}
                        className="mt-6 w-full rounded-md bg-navy px-4 py-3 font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
                    >
                        {enviando ? "Criando..." : "Criar evento"}
                    </button>
                </form>

                <a href="/dashboard" className="mt-6 inline-block text-sm text-navy hover:underline">
                    Voltar para meus eventos
                </a>
            </div>
        </main>
    );
}