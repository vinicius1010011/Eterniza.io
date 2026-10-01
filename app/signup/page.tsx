"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
    const router = useRouter();
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErro(null);
        setCarregando(true);

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome, email, senha }),
            });

            const data = await response.json();

            if (!response.ok) {
                setErro(data.error || "Não foi possível criar a conta.");
                return;
            }

            router.push("/login");
        } catch (err) {
            setErro("Não foi possível conectar ao servidor.");
        } finally {
            setCarregando(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
            <div className="w-full max-w-sm rounded-lg bg-surface p-10 shadow-sm">
                <div className="mb-8 border-b border-gold/40 pb-6">
                    <p className="font-logo text-3xl font-bold text-ink">Eterniza.io</p>
                    <p className="mt-2 text-sm text-ink/60">
                        Crie sua conta para começar a guardar cada momento do seu Evento.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="nome" className="text-sm text-ink/80">
                            Seu nome
                        </label>
                        <input
                            id="nome"
                            type="text"
                            required
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Como podemos te chamar"
                            className="rounded-md border border-ink/15 bg-background px-3 py-2 text-ink outline-none focus:border-navy focus:ring-1 focus:ring-navy"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-sm text-ink/80">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="voces@exemplo.com"
                            className="rounded-md border border-ink/15 bg-background px-3 py-2 text-ink outline-none focus:border-navy focus:ring-1 focus:ring-navy"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="senha" className="text-sm text-ink/80">
                            Senha
                        </label>
                        <input
                            id="senha"
                            type="password"
                            required
                            minLength={6}
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="rounded-md border border-ink/15 bg-background px-3 py-2 text-ink outline-none focus:border-navy focus:ring-1 focus:ring-navy"
                        />
                    </div>

                    {erro && (
                        <p className="text-sm text-red-600">{erro}</p>
                    )}

                    <button
                        type="submit"
                        disabled={carregando}
                        className="mt-2 rounded-md bg-navy px-4 py-2.5 font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
                    >
                        {carregando ? "Criando conta..." : "Criar conta"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-ink/60">
                    Já tem uma conta?{" "}
                    <a href="/login" className="text-navy hover:underline">
                        Entrar
                    </a>
                </p>
            </div>
        </main>
    );
}