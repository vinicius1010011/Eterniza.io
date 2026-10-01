-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'live', 'ended', 'album_processing', 'album_ready');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('photo', 'video');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "couples" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "couple_id" TEXT NOT NULL,
    "nome_evento" TEXT NOT NULL,
    "data_casamento" TIMESTAMP(3),
    "slug_publico" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "moderacao_ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerrado_em" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_session" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "nome_convidado" TEXT,
    "token_sessao" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_post" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "guest_session_id" TEXT NOT NULL,
    "tipo" "MediaType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "musica_fonte" TEXT,
    "musica_track_id" TEXT,
    "musica_titulo" TEXT,
    "musica_artista" TEXT,
    "musica_preview_url" TEXT,
    "mensagem_texto" TEXT,
    "status" "MediaStatus" NOT NULL DEFAULT 'pending',
    "ordem_no_album" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "video_final_url" TEXT,
    "galeria_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado_em" TIMESTAMP(3),

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "couples_email_key" ON "couples"("email");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_publico_key" ON "events"("slug_publico");

-- CreateIndex
CREATE UNIQUE INDEX "guest_session_token_sessao_key" ON "guest_session"("token_sessao");

-- CreateIndex
CREATE INDEX "media_post_event_id_status_idx" ON "media_post"("event_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "albums_event_id_key" ON "albums"("event_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_couple_id_fkey" FOREIGN KEY ("couple_id") REFERENCES "couples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_session" ADD CONSTRAINT "guest_session_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_post" ADD CONSTRAINT "media_post_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_post" ADD CONSTRAINT "media_post_guest_session_id_fkey" FOREIGN KEY ("guest_session_id") REFERENCES "guest_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
