import { ExternalLink, LoaderCircle, Star, Tag } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/core/components/ui/Button'

import { architectureColors, categoryTagColors } from '../constants'
import { useCreateReview } from '../repositories'
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

type ApplicationInfoColumnsProps = {
  application: ApplicationDetailModel
}

export function ApplicationInfoColumns({ application }: ApplicationInfoColumnsProps) {
  const latestReview = application.reviews[0]
  const createReviewMutation = useCreateReview(application.id)
  const [reviewFormOpen, setReviewFormOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')

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
            onClick={() => setReviewFormOpen((current) => !current)}
            className="text-xs text-[#00bfff] transition-colors hover:text-[#33ccff]"
          >
            {reviewFormOpen ? 'Cancelar' : 'Escrever avaliação'}
          </button>
        </header>
        <Stars value={application.rating ?? 0} />
        {reviewFormOpen ? (
          <form
            className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/25 p-3"
            onSubmit={(event) => {
              event.preventDefault()
              submitReview()
            }}
          >
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
              <span className="truncate text-sm font-medium text-white">{latestReview.author}</span>
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
