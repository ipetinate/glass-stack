import type {
  ApplicationDetail,
  ApplicationSummary,
  InstalledApplication,
} from '@/modules/applications-store/types'

const iconSrc = '/images/logo.png'
const screenshotSrc = '/images/wallpapers/default-dark.avif'

const sharedRequirements = [
  { category: 'Memory', minimum: '2 GB', recommended: '4 GB+' },
  { category: 'Storage', minimum: '50 GB', recommended: '100 GB+' },
  { category: 'Processor', minimum: 'Dual Core 64 bits', recommended: 'Six Core ARM' },
]

function buildReviews(prefix: string): ApplicationDetail['reviews'] {
  return [
    {
      id: `${prefix}-review-1`,
      author: 'Eric E.',
      postedAt: '2025-03-20T10:00:00Z',
      snippet:
        'Works great on my homelab. Installation was quick and the app came up without any manual adjustments.',
      rating: 5,
    },
    {
      id: `${prefix}-review-2`,
      author: 'Marina S.',
      postedAt: '2025-03-15T10:00:00Z',
      snippet: 'Great self-hosted alternative, just wished for more backup options.',
      rating: 4,
    },
  ]
}

export const applications: ApplicationSummary[] = [
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    developer: 'Jellyfin Dev Team',
    description: 'Your media, your server, your way.',
    category: 'Multimedia',
    tags: ['Multimedia', 'Video', 'Library'],
    iconSrc,
    screenshots: [
      { id: 'jellyfin-1', src: screenshotSrc, alt: 'Jellyfin screenshot' },
      { id: 'jellyfin-2', src: screenshotSrc, alt: 'Jellyfin library' },
    ],
    rating: 4.8,
    downloads: '12.4k',
    status: 'available',
  },
  {
    id: 'immich',
    name: 'Immich',
    developer: 'Immich Team',
    description: 'Photo and video backup with a focus on privacy.',
    category: 'Multimedia',
    tags: ['Multimedia', 'Photos'],
    iconSrc,
    screenshots: [{ id: 'immich-1', src: screenshotSrc, alt: 'Immich screenshot' }],
    rating: 4.6,
    downloads: '8.1k',
    status: 'available',
  },
  {
    id: 'nextcloud',
    name: 'Nextcloud',
    developer: 'Nextcloud GmbH',
    description: 'Files, calendar and collaboration in one place.',
    category: 'Productivity',
    tags: ['Productivity', 'Files'],
    iconSrc,
    screenshots: [{ id: 'nextcloud-1', src: screenshotSrc, alt: 'Nextcloud screenshot' }],
    rating: 4.5,
    downloads: '10.7k',
    status: 'available',
  },
  {
    id: 'adguard',
    name: 'AdGuard Home',
    developer: 'AdGuard Team',
    description: 'Network-wide ads and trackers blocking.',
    category: 'Networking',
    tags: ['Networking', 'DNS'],
    iconSrc,
    screenshots: [{ id: 'adguard-1', src: screenshotSrc, alt: 'AdGuard Home screenshot' }],
    rating: 4.7,
    downloads: '6.2k',
    status: 'available',
  },
]

export const installedApplications: InstalledApplication[] = [
  {
    id: 'jellyfin',
    title: 'Jellyfin',
    version: '10.9.0',
    status: 'installed',
    runtime: 'running',
    accessUrl: 'http://localhost:8096/',
    options: {},
    lastError: '',
    updatedAt: '2026-08-28T18:00:00Z',
  },
  {
    id: 'gitea',
    title: 'Gitea',
    version: '1.22.1',
    status: 'installing',
    runtime: 'stopped',
    accessUrl: '',
    options: {},
    lastError: '',
    updatedAt: '2026-08-28T19:05:00Z',
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
    longDescription: `${application.description} The application runs on your GlassStack and can be accessed by authorized devices.`,
  }
}

