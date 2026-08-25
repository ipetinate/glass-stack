import { Copy, ExternalLink, LoaderCircle, LogOut, Star, Tag } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/core/components/ui/Button'

import { architectureColors, categoryTagColors } from '../constants'
import {
  useCancelReviewLogin,
  useCreateReview,
  useReviewSession,
  useStartReviewLogin,
} from '../repositories'
import type { ApplicationDetail as ApplicationDetailModel } from '../types'

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((position) => (
        <Star
          key={position}
          className={
            position <= Math.round(value)
              ? 'size-3.5 fill-current text-amber-300'
              : 'size-3.5 text-white/25'
          }
        />
      ))}
    </span>
  )
}

function formatRelativeTime(value: string) {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value
  const elapsedDays = Math.floor((Date.now() - timestamp) / 86_400_000)
  if (elapsedDays <= 0) return 'hoje'
  if (elapsedDays === 1) return 'há 1 dia'
  if (elapsedDays < 30) return `há ${elapsedDays} dias`
  const elapsedMonths = Math.floor(elapsedDays / 30)
  if (elapsedMonths === 1) return 'há 1 mês'
  if (elapsedMonths < 12) return `há ${elapsedMonths} meses`
  const elapsedYears = Math.floor(elapsedMonths / 12)
  return elapsedYears === 1 ? 'há 1 ano' : `há ${elapsedYears} anos`
}

function StarPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((position) => (
        <button
          key={position}
          type="button"
          aria-label={`${position} estrela${position > 1 ? 's' : ''}`}
          onMouseEnter={() => setHovered(position)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(position)}
        >
          <Star
            className={
              position <= (hovered || value)
                ? 'size-6 fill-current text-amber-300 transition-colors'
                : 'size-6 text-white/30 transition-colors hover:text-white/60'
            }
          />
        </button>
      ))}
    </div>
  )
}

function GitHubGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.99 7.99 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

function GoogleGlyph() {
  return (
    <span
      aria-hidden="true"
      className="flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#1a73e8]"
    >
      G
    </span>
  )
}

type ApplicationInfoColumnsProps = {
  application: ApplicationDetailModel
}

export function ApplicationInfoColumns({ application }: ApplicationInfoColumnsProps) {
  const latestReview = application.reviews[0]
  const createReviewMutation = useCreateReview(application.id)
  const startLoginMutation = useStartReviewLogin()
  const cancelLoginMutation = useCancelReviewLogin()
  const [reviewFormOpen, setReviewFormOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)

  const sessionQuery = useReviewSession(reviewFormOpen)
  const session = sessionQuery.data
  const isAuthenticated = session?.status === 'authenticated'
  const isPending = session?.status === 'pending'

  const toggleForm = () => {
    setReviewFormOpen((current) => !current)
    setCodeCopied(false)
    if (reviewFormOpen) {
      setReviewRating(0)
      setReviewComment('')
    }
  }

  const submitReview = () => {
    createReviewMutation.mutate(
      { rating: reviewRating, comment: reviewComment },
      {
        onSuccess: () => {
          setReviewFormOpen(false)
          setReviewRating(0)
          setReviewComment('')
        },
      },
    )
  }

  return (
    <div className="grid gap-6 border-t border-white/10 pt-6 md:grid-cols-3">
      <section aria-label="Avaliações" className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-white">Avaliações</h2>
          <button
            type="button"
            onClick={toggleForm}
            className="text-xs text-[#00bfff] transition-colors hover:text-[#33ccff]"
          >
            {reviewFormOpen ? 'Cancelar' : 'Escrever avaliação'}
          </button>
        </header>
        <Stars value={application.rating ?? 0} />
        {reviewFormOpen && !isAuthenticated ? (
          <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/25 p-4">
            {isPending ? (
              <>
                <p className="text-xs leading-5 text-white/70">
                  Abra o link abaixo e digite o código para conectar sua conta{' '}
                  {session?.provider === 'google' ? 'Google' : 'GitHub'}.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="rounded-md border border-cyan-300/40 bg-black/50 px-4 py-2 font-mono text-xl tracking-[0.3em] text-cyan-200">
                    {session?.userCode}
                  </code>
                  <button
                    type="button"
                    aria-label="Copiar código"
                    onClick={() => {
                      void navigator.clipboard.writeText(session?.userCode ?? '')
                      setCodeCopied(true)
                    }}
                    className="flex size-8 items-center justify-center rounded-md border border-white/15 text-white/70 transition-colors hover:border-cyan-300/60 hover:text-cyan-300"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
                {codeCopied ? (
                  <span className="text-center text-[11px] text-white/45">Código copiado.</span>
                ) : null}
                <a
                  href={session?.verificationUri || 'https://github.com/login/device'}
                  target="_blank"
                  rel="noreferrer"
                  className="mx-auto inline-flex w-fit items-center gap-1.5 text-xs text-[#00bfff] transition-colors hover:text-[#33ccff]"
                >
                  Abrir página de autorização
                  <ExternalLink className="size-3" />
                </a>
                <p className="flex items-center justify-center gap-2 text-[11px] text-white/50">
                  <LoaderCircle className="size-3 animate-spin" />
                  Aguardando autorização…
                </p>
              </>
            ) : (
              <>
                <p className="text-xs leading-5 text-white/70">
                  Entre com sua conta para publicar sua avaliação.
                </p>
                {startLoginMutation.isError ? (
                  <p role="alert" className="text-xs leading-4 text-rose-300">
                    {startLoginMutation.error instanceof Error
                      ? startLoginMutation.error.message
                      : 'Não foi possível iniciar o login.'}
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={startLoginMutation.isPending}
                    onClick={() => startLoginMutation.mutate('github')}
                    className="min-h-9 border-white/20 bg-white/95 text-black hover:bg-white"
                  >
                    <GitHubGlyph />
                    GitHub
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={startLoginMutation.isPending}
                    onClick={() => startLoginMutation.mutate('google')}
                    className="min-h-9 border-white/20 bg-white/95 text-black hover:bg-white"
                  >
                    <GoogleGlyph />
                    Google
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
        {reviewFormOpen && isAuthenticated ? (
          <form
            className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/25 p-3"
            onSubmit={(event) => {
              event.preventDefault()
              submitReview()
            }}
          >
            <div className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2.5 py-1.5">
              <span className="flex min-w-0 items-center gap-2">
                {session?.avatarUrl ? (
                  <img src={session.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
                ) : null}
                <span className="truncate text-xs font-medium text-white">{session?.login}</span>
                <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/60">
                  {session?.provider === 'google' ? 'Google' : 'GitHub'}
                </span>
              </span>
              <button
                type="button"
                aria-label="Desconectar conta"
                title="Sair"
                onClick={() => cancelLoginMutation.mutate()}
                className="shrink-0 text-white/50 transition-colors hover:text-rose-300"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
            <StarPicker value={reviewRating} onChange={setReviewRating} />
            <textarea
              aria-label="Seu comentário"
              placeholder="Conte como foi sua experiência…"
              required
              rows={3}
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              className="w-full resize-none rounded-md border border-white/15 bg-black/40 p-2 text-xs text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60"
            />
            {createReviewMutation.isError ? (
              <p role="alert" className="text-xs leading-4 text-rose-300">
                {(createReviewMutation.error instanceof Error
                  ? createReviewMutation.error.message
                  : '') || 'Não foi possível publicar a avaliação.'}
              </p>
            ) : null}
            <Button
              type="submit"
              size="sm"
              disabled={
                createReviewMutation.isPending ||
                reviewRating < 1 ||
                reviewComment.trim().length === 0
              }
              className="min-h-7 w-fit self-end bg-[#00bfff] px-3 text-xs text-black hover:bg-[#33ccff]"
            >
              {createReviewMutation.isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : null}
              Publicar avaliação
            </Button>
          </form>
        ) : null}
        {latestReview ? (
          <article className="rounded-lg bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                {latestReview.avatar ? (
                  <img src={latestReview.avatar} alt="" className="size-5 rounded-full object-cover" />
                ) : null}
                <span className="truncate text-sm font-medium text-white">{latestReview.author}</span>
              </span>
              <span className="shrink-0 text-[11px] text-white/45">
                {formatRelativeTime(latestReview.postedAt)}
              </span>
            </div>
            {latestReview.rating > 0 ? (
              <Stars value={latestReview.rating} />
            ) : null}
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/70">{latestReview.snippet}</p>
          </article>
        ) : null}
        {application.reviews.length > 1 ? (
          <button
            type="button"
            className="w-fit text-xs text-white/50 transition-colors hover:text-white/80"
          >
            Ver todas as avaliações
          </button>
        ) : null}
      </section>

      <section aria-label="Detalhes técnicos" className="flex flex-col gap-3 border-white/10 md:border-l md:pl-6">
        <h2 className="text-base font-semibold text-white">Detalhes</h2>
        <dl className="grid content-start gap-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-white/55">Última versão</dt>
            <dd>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-base font-semibold text-cyan-200">
                <Tag className="size-4" aria-hidden="true" />
                {application.version}
              </span>
            </dd>
          </div>
          {application.imageSize ? (
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Tamanho da imagem</dt>
              <dd className="text-white">{application.imageSize}</dd>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <dt className="text-white/55">Arquiteturas</dt>
            <dd className="flex flex-wrap gap-x-3 gap-y-1">
              {application.architectures.map((architecture) => (
                <span key={architecture} style={{ color: architectureColors[architecture] }}>
                  {architecture}
                </span>
              ))}
            </dd>
          </div>
        </dl>
        {application.dockerHubUrl ? (
          <a
            href={application.dockerHubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-xs text-[#00bfff] transition-colors hover:text-[#33ccff]"
          >
            Abrir no Docker Hub
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </section>

      <section aria-label="Requisitos" className="flex flex-col gap-3 border-white/10 md:border-l md:pl-6">
        <h2 className="text-base font-semibold text-white">Requisitos</h2>
        <table className="w-full overflow-hidden rounded-md border-separate border-spacing-0 text-left text-xs backdrop-blur-sm">
          <thead>
            <tr className="text-white/80">
              {['Categoria', 'Mínimo', 'Recomendado'].map((heading) => (
                <th key={heading} scope="col" className="border-l border-t border-white/10 bg-white/5 px-2.5 py-2 font-semibold first:border-l-0">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {application.requirements.map((requirement) => (
              <tr key={requirement.category} className="text-white/75">
                <td className="border-l border-t border-white/10 bg-white/[0.03] px-2.5 py-2 first:border-l-0">
                  {requirement.category}
                </td>
                <td className="border-l border-t border-white/10 bg-white/[0.03] px-2.5 py-2">
                  {requirement.minimum}
                </td>
                <td className="border-l border-t border-white/10 bg-white/[0.03] px-2.5 py-2">
                  {requirement.recommended}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export { Stars }

export function ApplicationCategoryTags({ tags }: { tags: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {tags.map((tag) => (
        <span key={tag} style={{ color: categoryTagColors[tag] ?? '#ffffff99' }}>
          {tag}
        </span>
      ))}
    </span>
  )
}
