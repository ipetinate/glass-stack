import { cn } from '@/core/functions/class-name/class-name'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export type AvatarProps = {
  size?: AvatarSize
  image?: string
  initials?: string
}

export function Avatar({ image, initials, size }: AvatarProps) {
  const sizeClasses = {
    sm: 'size-14',
    md: 'size-[76px]',
    lg: 'size-24',
    xl: 'size-[116px]',
  }

  return (
    <div
      className={cn(
        sizeClasses[size || 'md'],
        'rounded-full',
        'bg-gray-200',
        'dark:bg-gray-700',
      )}
    >
      {image && (
        <img
          src={image}
          alt="Avatar"
          className={cn(
            sizeClasses[size || 'md'],
            'rounded-full',
            'object-cover',
          )}
        />
      )}

      {initials && (
        <div
          className={cn(
            sizeClasses[size || 'md'],
            'flex items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200',
          )}
        >
          {initials}
        </div>
      )}
    </div>
  )
}
