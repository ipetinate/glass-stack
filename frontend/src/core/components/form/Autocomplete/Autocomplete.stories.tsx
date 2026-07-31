import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StoryCanvas } from '../../../../../.storybook/StoryCanvas'
import { Autocomplete } from './Autocomplete'

const options = [{ value: 'adguard', label: 'AdGuard Home' }, { value: 'grafana', label: 'Grafana' }, { value: 'immich', label: 'Immich' }]
const meta = { title: 'Core/Form/Autocomplete', component: Autocomplete, tags: ['autodocs'] } satisfies Meta<typeof Autocomplete>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { render: (args) => <StoryCanvas><div className="max-w-[400px]"><Autocomplete {...args} /></div></StoryCanvas>, args: { label: 'Aplicação', options, searchPlaceholder: 'Buscar aplicação' } }
export const Controlled: Story = { render: () => { const [value, setValue] = useState(''); return <StoryCanvas><div className="max-w-[400px]"><Autocomplete label="Aplicação" value={value} onValueChange={(next) => setValue(String(next))} options={options} /></div></StoryCanvas> } }
