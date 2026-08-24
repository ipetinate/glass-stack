/* oxlint-disable react/only-export-components */

import type { Meta, StoryObj } from '@storybook/react-vite'

import { GlassStackLoader } from './GlassStackLoader'

function LoaderFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full min-w-80 flex-wrap items-center justify-center gap-10 p-10 font-encode text-white">
      {children}
    </div>
  )
}

function LoaderSizes() {
  return (
    <LoaderFrame>
      <GlassStackLoader size={24} label="Carregando miniatura" />
      <GlassStackLoader size={48} />
      <GlassStackLoader size={96} label="Carregando dados do host" />
      <GlassStackLoader size={192} />
    </LoaderFrame>
  )
}

function LoaderWithLabel() {
  return (
    <LoaderFrame>
      <div className="flex flex-col items-center gap-4">
        <GlassStackLoader size={128} label="Conectando ao Glass Stack…" />
        <span className="text-sm text-white/70">Conectando ao Glass Stack…</span>
      </div>
    </LoaderFrame>
  )
}

const meta = {
  title: 'Core/UI/GlassStackLoader',
  component: GlassStackLoader,
  tags: ['autodocs'],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

const SizesStory: Story = { render: LoaderSizes }
const WithLabelStory: Story = { render: LoaderWithLabel }

export { SizesStory as Sizes, WithLabelStory as WithLabel }
