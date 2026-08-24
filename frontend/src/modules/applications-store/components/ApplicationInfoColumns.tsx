import { ExternalLink, Star } from 'lucide-react'

import { architectureColors, categoryTagColors } from '../constants'
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

type ApplicationInfoColumnsProps = {
  application: ApplicationDetailModel
}

export function ApplicationInfoColumns({ application }: ApplicationInfoColumnsProps) {
  const latestReview = application.reviews[0]

  return (
    <div className="grid gap-6 border-t border-white/10 pt-6 md:grid-cols-3">
      <section aria-label="Avaliações" className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-white">Avaliações</h2>
          <button
            type="button"
            className="text-xs text-[#00bfff] transition-colors hover:text-[#33ccff]"
          >
            Escrever avaliação
          </button>
        </header>
        <Stars value={application.rating} />
        {latestReview ? (
          <article className="rounded-lg bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-white">{latestReview.author}</span>
              <span className="shrink-0 text-[11px] text-white/45">{latestReview.postedAt}</span>
            </div>
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
          <div className="flex justify-between gap-4">
            <dt className="text-white/55">Última versão</dt>
            <dd className="text-white">{application.version}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/55">Tamanho da imagem</dt>
            <dd className="text-white">{application.imageSize}</dd>
          </div>
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
