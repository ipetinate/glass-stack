import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StoryCanvas } from '../../../../../.storybook/StoryCanvas'
import { Slider } from './Slider'

const meta = { title: 'Core/Form/Slider', component: Slider, tags: ['autodocs'] } satisfies Meta<typeof Slider>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { label: 'Retenção de logs', min: 0, max: 100, defaultValue: 65, helperText: 'Defina a retenção desejada para os logs.' } }
export const Controlled: Story = { render: () => { const [value, setValue] = useState('65'); return <StoryCanvas><Slider label={`Retenção de logs: ${value}%`} min="0" max="100" value={value} onChange={(event) => setValue(event.target.value)} /></StoryCanvas> } }
