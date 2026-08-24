import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StoryCanvas } from '../../../../../.storybook/StoryCanvas'
import { Textarea } from './Textarea'

const meta = { title: 'Core/Form/Textarea', component: Textarea, tags: ['autodocs'] } satisfies Meta<typeof Textarea>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { label: 'Descrição', defaultValue: 'O GlassStack mantém os controles reutilizáveis no core.', helperText: 'Descreva sua configuração.' } }
export const Error: Story = { args: { label: 'Descrição', error: 'A descrição é obrigatória.' } }
export const Controlled: Story = { render: () => { const [value, setValue] = useState(''); return <StoryCanvas><Textarea label="Descrição" value={value} onChange={(event) => setValue(event.target.value)} helperText={`${value.length} caracteres`} /></StoryCanvas> } }
