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
  author: string
  avatar?: string
  provider?: 'github' | 'google'
  postedAt: string
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
  tags: string[]
  iconSrc: string
  screenshots: AppScreenshot[]
  rating?: number
  downloads?: string
  status: AppStatus
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

export type InstallRequest = {
  appId: string
  mode: InstallationMode
  options?: {
    port?: number
    volume?: string
  }
}

export type InstallOperation = {
  id: string
  appId: string
  status: Extract<AppStatus, 'installing' | 'installed' | 'error'>
  progress: number
  message: string
}

