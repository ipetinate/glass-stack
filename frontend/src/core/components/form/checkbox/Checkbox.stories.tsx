import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StoryCanvas } from '../../../../../.storybook/StoryCanvas'
import { Checkbox, Radio } from './CheckboxField'

const meta = { title: 'Core/Form/Checkbox', component: Checkbox, tags: ['autodocs'] } satisfies Meta<typeof Checkbox>
export default meta
type Story = StoryObj<typeof meta>

export const Unchecked: Story = { args: { label: 'Ativar atualizações automáticas', helperText: 'O sistema instala somente versões compatíveis.' } }
export const Checked: Story = { args: { label: 'Ativar atualizações automáticas', defaultChecked: true } }
export const Error: Story = { args: { label: 'Estado inválido', error: 'Você precisa confirmar esta opção.' } }
export const RadioGroup: Story = { render: () => { const [choice, setChoice] = useState('dark'); return <StoryCanvas><div className="space-y-3"><Radio label="Tema escuro" name="theme" value="dark" checked={choice === 'dark'} onChange={() => setChoice('dark')} /><Radio label="Tema claro" name="theme" value="light" checked={choice === 'light'} onChange={() => setChoice('light')} /></div></StoryCanvas> } }
