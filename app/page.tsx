"use client";

import { useEffect, useState } from "react";

const passos = [
  {
    titulo: "Crie o evento",
    texto: "Cadastre a festa e receba um QR code para colocar nas mesas ou no telão.",
  },
  {
    titulo: "Convidados participam",
    texto: "Cada convidado aponta a câmera do celular e envia fotos e vídeos na hora, sem instalar nada.",
  },
  {
    titulo: "Receba seu álbum",
    texto: "Você escolhe o que entra e o Eterniza.io monta tudo num vídeo para assistir, baixar e compartilhar.",
  },
];

export default function HomePage() {
  const [logado, setLogado] = useState(false);

  useEffect(() => {
    setLogado(Boolean(localStorage.getItem("token")));
  }, []);

  return (
      <main className="min-h-screen bg-background px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-logo text-5xl font-bold text-ink sm:text-6xl">Eterniza.io</h1>
          <div className="mx-auto mt-6 h-px w-24 bg-gold" />

          <p className="mt-8 font-display text-2xl text-ink">Bem-vindo(a)!</p>
          <p className="mx-auto mt-4 max-w-lg text-ink/70">
            O Eterniza.io transforma os momentos de qualquer festa em memória. Aniversários,
            formaturas, casamentos: os convidados registram o evento com fotos e vídeos, e
            você recebe tudo reunido em um álbum em vídeo.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
            {passos.map((passo, i) => (
                <div key={passo.titulo} className="rounded-lg bg-surface p-5">
                  <p className="text-sm font-medium text-gold">Passo {i + 1}</p>
                  <p className="mt-1 font-display text-lg text-ink">{passo.titulo}</p>
                  <p className="mt-2 text-sm text-ink/70">{passo.texto}</p>
                </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {logado ? (
                <a
                    href="/dashboard"
                    className="rounded-md bg-navy px-6 py-3 font-medium text-white transition-colors hover:bg-navy-dark"
                >
                  Comece a criar seu Evento
                </a>
            ) : (
                <>
                  <a
                      href="/signup"
                      className="rounded-md bg-navy px-6 py-3 font-medium text-white transition-colors hover:bg-navy-dark"
                  >
                    Criar conta
                  </a>
                  <a
                      href="/login"
                      className="rounded-md border border-navy px-6 py-3 font-medium text-navy transition-colors hover:bg-navy/10"
                  >
                    Entrar
                  </a>
                </>
            )}
          </div>
        </div>
      </main>
  );
}

