import { isRouteErrorResponse, useRouteError } from 'react-router'

import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'

export function ErrorBoundary() {
  const error = useRouteError()
  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong'
  const message =
    error instanceof Error
      ? error.message
      : 'An unexpected error occurred. Please try again later.'

  return (
    <BackgroundBlur className="flex h-full min-h-full w-full flex-col items-center justify-center gap-5 p-8 text-[#151A21] dark:text-white">
      <h1 className="text-2xl font-semibold text-current">{title}</h1>
      <p className="max-w-xl text-center text-sm text-[#151A21]/70 dark:text-white/65">
        {message}
      </p>
    </BackgroundBlur>
  )
}
