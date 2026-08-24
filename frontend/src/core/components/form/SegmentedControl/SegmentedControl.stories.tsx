import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StoryCanvas } from '../../../../../.storybook/StoryCanvas'
import { SegmentedControl } from './SegmentedControl'

const options = [{ value: 'day' as const, label: 'Dia' }, { value: 'week' as const, label: 'Semana' }, { value: 'month' as const, label: 'Mês' }]
const meta = { title: 'Core/Form/SegmentedControl', component: SegmentedControl, tags: ['autodocs'] } satisfies Meta<typeof SegmentedControl>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { options, defaultValue: 'week', 'aria-label': 'Período do gráfico' } }
export const Sizes: Story = { args: { options, defaultValue: 'week' }, render: () => { const [value, setValue] = useState<'day' | 'week' | 'month'>('week'); return <StoryCanvas><div className="flex flex-wrap items-center gap-4"><SegmentedControl size="xs" options={options} value={value} onValueChange={setValue} aria-label="Pequeno" /><SegmentedControl size="md" options={options} value={value} onValueChange={setValue} aria-label="Médio" /><SegmentedControl size="lg" options={options} value={value} onValueChange={setValue} aria-label="Grande" /></div></StoryCanvas> } }
