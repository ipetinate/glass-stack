import type { ApplicationDetail, ApplicationSummary } from '@/modules/applications-store/types'

const iconSrc = '/images/logo.png'
const screenshotSrc = '/images/wallpapers/default-dark.avif'

const sharedRequirements = [
  { category: 'Memória', minimum: '2 GB', recommended: '4 GB+' },
  { category: 'Armazenamento', minimum: '50 GB', recommended: '100 GB+' },
  { category: 'Processador', minimum: 'Dual Core 64 bits', recommended: 'Six Core ARM' },
]

function buildReviews(prefix: string): ApplicationDetail['reviews'] {
  return [
    {
      id: `${prefix}-review-1`,
      author: 'Eric E.',
      postedAt: 'há 3 dias',
      snippet:
        'Funciona muito bem no meu homelab. A instalação foi rápida e o app subiu sem nenhum ajuste manual.',
      rating: 5,
    },
    {
      id: `${prefix}-review-2`,
      author: 'Marina S.',
      postedAt: 'há 1 semana',
      snippet: 'Ótima alternativa self-hosted, só senti falta de mais opções de backup.',
      rating: 4,
    },
  ]
}

export const applications: ApplicationSummary[] = [
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    developer: 'Jellyfin Dev Team',
    description: 'Sua mídia, seu servidor, do seu jeito.',
    category: 'Multimedia',
    tags: ['Multimedia', 'Video', 'Library'],
    iconSrc,
    screenshots: [
      { id: 'jellyfin-1', src: screenshotSrc, alt: 'Tela do Jellyfin' },
      { id: 'jellyfin-2', src: screenshotSrc, alt: 'Biblioteca do Jellyfin' },
    ],
    rating: 4.8,
    downloads: '12.4k',
    status: 'available',
  },
  {
    id: 'immich',
    name: 'Immich',
    developer: 'Immich Team',
    description: 'Backup e organização de fotos com foco em privacidade.',
    category: 'Multimedia',
    tags: ['Multimedia', 'Photos'],
    iconSrc,
    screenshots: [{ id: 'immich-1', src: screenshotSrc, alt: 'Tela do Immich' }],
    rating: 4.6,
    downloads: '8.1k',
    status: 'available',
  },
  {
    id: 'nextcloud',
    name: 'Nextcloud',
    developer: 'Nextcloud GmbH',
    description: 'Arquivos, calendário e colaboração em um único lugar.',
    category: 'Productivity',
    tags: ['Productivity', 'Files'],
    iconSrc,
    screenshots: [{ id: 'nextcloud-1', src: screenshotSrc, alt: 'Tela do Nextcloud' }],
    rating: 4.5,
    downloads: '10.7k',
    status: 'available',
  },
  {
    id: 'adguard',
    name: 'AdGuard Home',
    developer: 'AdGuard Team',
    description: 'Bloqueio de anúncios e rastreadores para toda a rede.',
    category: 'Networking',
    tags: ['Networking', 'DNS'],
    iconSrc,
    screenshots: [{ id: 'adguard-1', src: screenshotSrc, alt: 'Tela do AdGuard Home' }],
    rating: 4.7,
    downloads: '6.2k',
    status: 'available',
  },
]

export function getApplicationDetail(id: string): ApplicationDetail | undefined {
  const application = applications.find((item) => item.id === id)
  if (!application) return undefined

  return {
    ...application,
    type: 'Docker Image',
    version: '0.5.8',
    imageSize: '243 MB',
    architectures: ['x86-64', 'arm64', 'riscv64', 'mips64'],
    requirements: sharedRequirements,
    reviews: buildReviews(application.id),
    dockerHubUrl: `https://hub.docker.com/r/${application.id}`,
    longDescription: `${application.description} O aplicativo é executado no seu GlassStack e pode ser acessado pelos dispositivos autorizados.`,
  }
}

