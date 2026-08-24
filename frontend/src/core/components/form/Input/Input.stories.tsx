import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StoryCanvas } from '../../../../../.storybook/StoryCanvas'
import { Input } from './Input'

const meta = { title: 'Core/Form/Input', component: Input, tags: ['autodocs'] } satisfies Meta<typeof Input>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { label: 'Nome', defaultValue: 'Ada Lovelace', helperText: 'Informe seu nome completo.' } }
export const Password: Story = { args: { label: 'Senha', type: 'password', defaultValue: 'glass-stack', allowPaste: true } }
export const Masked: Story = { args: { label: 'CPF', mask: '000.000.000-00', placeholder: '000.000.000-00' } }
export const Error: Story = { args: { label: 'Campo inválido', error: 'Informe um valor válido.', defaultValue: 'incompleto' } }
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState('Ada Lovelace')
    return <StoryCanvas><Input label="Nome" value={value} onChange={(event) => setValue(event.target.value)} clearable onClear={() => setValue('')} prepend="@" /></StoryCanvas>
  },
}
