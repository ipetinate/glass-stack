export const INPUT_OUTPUT_HISTORY_SIZE = 30

export const INPUT_OUTPUT_WIDGET_CLASS_NAME =
  'col-span-1 col-start-2 row-span-2 row-start-1 min-h-0'

export const INPUT_OUTPUT_SPARKLINE_ANIMATION = {
  duration: 900,
  easing: 'linear' as const,
}

export const INPUT_OUTPUT_GROUPS = {
  storage: {
    label: 'STORAGE DRIVE',
    readColor: '#7df4ad',
    writeColor: '#b27aff',
  },
  memory: {
    label: 'MEMORY',
    usedColor: '#f3ff4f',
    availableColor: '#ff83d6',
  },
  network: {
    label: 'NETWORK',
    downloadColor: '#ff6b6b',
    uploadColor: '#7ee8ff',
  },
} as const
