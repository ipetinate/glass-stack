import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StoryCanvas } from '../../../../../.storybook/StoryCanvas'
import { ColorPicker } from './ColorPicker'

const meta = { title: 'Core/Form/ColorPicker', component: ColorPicker, tags: ['autodocs'] } satisfies Meta<typeof ColorPicker>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { label: 'Cor de destaque', defaultValue: '#38bdf8', presets: ['#38bdf8', '#a78bfa', '#34d399', '#fb7185'], helperText: 'Use um preset ou informe um hexadecimal.' } }
export const Controlled: Story = { render: () => { const [color, setColor] = useState('#38bdf8'); return <StoryCanvas><ColorPicker label="Cor de destaque" value={color} onValueChange={setColor} presets={['#38bdf8', '#a78bfa', '#34d399', '#fb7185']} /></StoryCanvas> } }
