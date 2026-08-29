export type AppCategory =
  | 'Multimedia'
  | 'Productivity'
  | 'Networking'
  | 'Home'
  | 'Security'
  | 'DeveloperTools'
  | 'Other'

export type AppArchitecture = 'x86-64' | 'arm64' | 'riscv64' | 'mips64'

export type AppStatus = 'available' | 'installed' | 'installing' | 'error'

export type InstallationMode = 'standard' | 'custom'

export type AppScreenshot = {
  id: string
  src: string
  alt: string
}

export type AppReview = {
  id: string
  commentId?: string
  author: string
  avatar?: string
  provider?: 'github' | 'google'
  postedAt: string
  editedAt?: string
  edits?: number
  snippet: string
  rating: number
}

export type ReviewSession = {
  status: 'idle' | 'pending' | 'authenticated' | 'denied' | 'expired' | 'failed'
  provider?: 'github' | 'google'
  userCode?: string
  verificationUri?: string
  login?: string
  avatarUrl?: string
}

export type AppRequirement = {
  category: string
  minimum: string
  recommended: string
}

export type ApplicationSummary = {
  id: string
  name: string
  developer: string
  description: string
  category: AppCategory
  type?: string
  tags: string[]
  iconSrc: string
  screenshots: AppScreenshot[]
  rating?: number
  downloads?: string
  status: AppStatus
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
}

export type AppEntrypoint = {
  main: string
  index: string
  portMap: string
  scheme: string
}

export type ApplicationDetail = ApplicationSummary & {
  type: string
  version: string
  imageSize?: string
  architectures: AppArchitecture[]
  requirements: AppRequirement[]
  reviews: AppReview[]
  dockerHubUrl?: string
  longDescription: string
  entrypoint?: AppEntrypoint
}

export type InstallOptions = {
  port?: number
  volume?: string
}

export type InstallRequest = {
  appId: string
  mode: InstallationMode
  options?: InstallOptions
}

export type InstallOperationStatus =
  | 'queued'
  | 'installing'
  | 'updating'
  | 'editing'
  | 'removing'
  | 'installed'
  | 'removed'
  | 'error'

export type InstallOperation = {
  id: string
  appId: string
  status: InstallOperationStatus
  progress: number
  message: string
}

export type InstalledApplicationStatus =
  | 'installing'
  | 'installed'
  | 'updating'
  | 'editing'
  | 'removing'
  | 'removed'
  | 'error'

export type InstalledApplicationRuntime = 'running' | 'stopped' | 'degraded'

export type InstalledApplication = {
  id: string
  title: string
  version: string
  status: InstalledApplicationStatus
  runtime: InstalledApplicationRuntime
  accessUrl: string
  options: {
    port?: number
    volume?: string
  }
  lastError: string
  updatedAt: string
}

