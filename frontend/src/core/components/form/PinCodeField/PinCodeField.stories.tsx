import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StoryCanvas } from '../../../../../.storybook/StoryCanvas'
import { PinCodeField } from './PinCodeField'

const meta = { title: 'Core/Form/PinCodeField', component: PinCodeField, tags: ['autodocs'] } satisfies Meta<typeof PinCodeField>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { fields: 6, value: '461188', onChange: () => undefined }, render: () => { const [value, setValue] = useState('461188'); return <StoryCanvas><PinCodeField label="Código de autenticação" fields={6} value={value} onChange={setValue} /></StoryCanvas> } }
export const Grouped: Story = { args: { fields: 6, value: '461188', onChange: () => undefined }, render: () => { const [value, setValue] = useState('461188'); return <StoryCanvas><PinCodeField label="Código de autenticação" fields={6} groups={2} separator value={value} onChange={setValue} /></StoryCanvas> } }
