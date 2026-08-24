import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StoryCanvas } from '../../../../../.storybook/StoryCanvas'
import { Select } from './Select'

const options = [{ value: 'docker', label: 'Docker' }, { value: 'podman', label: 'Podman' }, { value: 'containerd', label: 'containerd', disabled: true }]
const metrics = [{ value: 'cpu', label: 'CPU' }, { value: 'memory', label: 'Memória' }, { value: 'storage', label: 'Armazenamento' }]
const meta = { title: 'Core/Form/Select', component: Select, tags: ['autodocs'] } satisfies Meta<typeof Select>
export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = { args: { label: 'Runtime', defaultValue: 'docker', options } }
export const Multiple: Story = { args: { label: 'Métricas visíveis', multiple: true, defaultValue: ['cpu', 'memory'], options: metrics } }
export const Controlled: Story = { render: () => { const [value, setValue] = useState('docker'); return <StoryCanvas><Select label="Runtime" value={value} onValueChange={(next) => setValue(String(next))} options={options} /></StoryCanvas> } }
