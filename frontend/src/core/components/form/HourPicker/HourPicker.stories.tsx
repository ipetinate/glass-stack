import type { Meta, StoryObj } from '@storybook/react-vite'

import { HourPicker } from './HourPicker'

const meta = { title: 'Core/Form/HourPicker', component: HourPicker, tags: ['autodocs'] } satisfies Meta<typeof HourPicker>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { label: 'Horário de execução' } }
