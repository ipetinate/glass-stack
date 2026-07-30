import type { PropsWithChildren } from 'react'

import { Widget } from '@/modules/dashboard/components/Widget'

import { INPUT_OUTPUT_WIDGET_CLASS_NAME } from '../InputOutput/InputOutput.constants'

export function InputOutputWidget({ children }: PropsWithChildren) {
  return (
    <Widget
      icon="Activity"
      title="Input / Output"
      className={INPUT_OUTPUT_WIDGET_CLASS_NAME}
    >
      {children}
    </Widget>
  )
}
