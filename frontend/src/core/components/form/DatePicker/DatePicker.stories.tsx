import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StoryCanvas } from '../../../../../.storybook/StoryCanvas'
import { DatePicker } from './DatePicker'

const meta = { title: 'Core/Form/DatePicker', component: DatePicker, tags: ['autodocs'] } satisfies Meta<typeof DatePicker>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { label: 'Data de início', defaultValue: '2026-07-31' } }
export const Range: Story = { args: { label: 'Período', range: true, defaultValue: { from: '2026-07-01', to: '2026-07-31' } } }
export const Controlled: Story = { render: () => { const [date, setDate] = useState('2026-07-31'); return <StoryCanvas><DatePicker label="Data de início" value={date} onValueChange={(next) => setDate(String(next))} /></StoryCanvas> } }
