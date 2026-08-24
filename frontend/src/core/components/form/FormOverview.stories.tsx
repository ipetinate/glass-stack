/* oxlint-disable react/only-export-components */

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Autocomplete,
  Checkbox,
  ColorPicker,
  DatePicker,
  HourPicker,
  Input,
  PinCodeField,
  Radio,
  Select,
  SegmentedControl,
  Slider,
  Textarea,
} from './index'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full min-w-80 p-6 font-encode text-white">
      <div className="mx-auto grid w-full max-w-xl gap-5">{children}</div>
    </div>
  )
}

function InputExample() {
  const [value, setValue] = useState('Ada Lovelace')
  return (
    <Frame>
      <Input
        label="Nome"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        clearable
        onClear={() => setValue('')}
        helperText="Aceita texto livre e pode ser limpo pelo slot de ação."
        prepend="@"
      />
      <Input label="Senha" type="password" defaultValue="glass-stack" allowPaste />
      <Input label="CPF" mask="000.000.000-00" placeholder="000.000.000-00" />
      <Input label="Campo inválido" error="Informe um valor válido." defaultValue="incompleto" />
    </Frame>
  )
}

function TextareaExample() {
  const [value, setValue] = useState('O GlassStack mantém os controles reutilizáveis no core.')
  return (
    <Frame>
      <Textarea
        label="Descrição"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        helperText={`${value.length} caracteres`}
        placeholder="Escreva uma descrição"
      />
      <Textarea label="Com erro" error="A descrição é obrigatória." />
    </Frame>
  )
}

function SelectExample() {
  const [value, setValue] = useState('docker')
  const [multiple, setMultiple] = useState<string[]>(['cpu', 'memory'])
  return (
    <Frame>
      <Select
        label="Runtime"
        value={value}
        onValueChange={(next) => setValue(String(next))}
        options={[
          { value: 'docker', label: 'Docker' },
          { value: 'podman', label: 'Podman' },
          { value: 'containerd', label: 'containerd', disabled: true },
        ]}
      />
      <Select
        label="Métricas visíveis"
        multiple
        value={multiple}
        onValueChange={(next) => setMultiple(Array.isArray(next) ? next : [next])}
        options={[
          { value: 'cpu', label: 'CPU' },
          { value: 'memory', label: 'Memória' },
          { value: 'storage', label: 'Armazenamento' },
        ]}
      />
    </Frame>
  )
}

function AutocompleteExample() {
  const [value, setValue] = useState('')
  return (
    <Frame>
      <Autocomplete
        label="Aplicação"
        value={value}
        onValueChange={(next) => setValue(String(next))}
        options={[
          { value: 'adguard', label: 'AdGuard Home' },
          { value: 'grafana', label: 'Grafana' },
          { value: 'immich', label: 'Immich' },
        ]}
        searchPlaceholder="Buscar aplicação"
      />
    </Frame>
  )
}

function CheckboxExample() {
  const [enabled, setEnabled] = useState(true)
  const [choice, setChoice] = useState('dark')
  return (
    <Frame>
      <Checkbox
        label="Ativar atualizações automáticas"
        checked={enabled}
        onChange={(event) => setEnabled(event.target.checked)}
        helperText="O sistema instala somente versões compatíveis."
      />
      <Radio label="Tema escuro" name="theme" value="dark" checked={choice === 'dark'} onChange={() => setChoice('dark')} />
      <Radio label="Tema claro" name="theme" value="light" checked={choice === 'light'} onChange={() => setChoice('light')} />
      <Checkbox label="Estado inválido" error="Você precisa confirmar esta opção." />
    </Frame>
  )
}

function ColorPickerExample() {
  const [color, setColor] = useState('#38bdf8')
  return (
    <Frame>
      <ColorPicker
        label="Cor de destaque"
        value={color}
        onValueChange={setColor}
        presets={['#38bdf8', '#a78bfa', '#34d399', '#fb7185']}
        helperText="Use um preset ou informe um valor hexadecimal."
      />
    </Frame>
  )
}

function DateExample() {
  const [date, setDate] = useState('2026-07-31')
  const [range, setRange] = useState<{ from?: string; to?: string }>({ from: '2026-07-01', to: '2026-07-31' })
  return (
    <Frame>
      <DatePicker label="Data de início" value={date} onValueChange={(next) => setDate(String(next))} />
      <DatePicker label="Período" range value={range} onValueChange={(next) => { if (typeof next !== 'string') setRange(next) }} />
      <HourPicker label="Horário de execução" />
    </Frame>
  )
}

function SliderExample() {
  const [value, setValue] = useState('65')
  return (
    <Frame>
      <Slider
        label={`Retenção de logs: ${value}%`}
        min="0"
        max="100"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        helperText="Defina a retenção desejada para os logs do host."
      />
    </Frame>
  )
}

function PinCodeExample() {
  const [value, setValue] = useState('461188')
  return (
    <Frame>
      <PinCodeField label="Código de autenticação" fields={6} groups={2} separator value={value} onChange={setValue} />
    </Frame>
  )
}

function SegmentedExample() {
  const [value, setValue] = useState<'day' | 'week' | 'month'>('week')
  return (
    <Frame>
      <SegmentedControl
        aria-label="Período do gráfico"
        value={value}
        onValueChange={setValue}
        options={[
          { value: 'day', label: 'Dia' },
          { value: 'week', label: 'Semana' },
          { value: 'month', label: 'Mês' },
        ]}
      />
    </Frame>
  )
}

const meta = {
  title: 'Core/Form/Overview',
  tags: ['!autodocs'],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

const InputStory: Story = { render: InputExample }
const TextareaStory: Story = { render: TextareaExample }
const SelectStory: Story = { render: SelectExample }
const AutocompleteStory: Story = { render: AutocompleteExample }
const CheckboxAndRadioStory: Story = { render: CheckboxExample }
const ColorPickerStory: Story = { render: ColorPickerExample }
const DateAndHourPickerStory: Story = { render: DateExample }
const SliderStory: Story = { render: SliderExample }
const PinCodeFieldStory: Story = { render: PinCodeExample }
const SegmentedControlStory: Story = { render: SegmentedExample }

export {
  InputStory as Input,
  TextareaStory as Textarea,
  SelectStory as Select,
  AutocompleteStory as Autocomplete,
  CheckboxAndRadioStory as CheckboxAndRadio,
  ColorPickerStory as ColorPicker,
  DateAndHourPickerStory as DateAndHourPicker,
  SliderStory as Slider,
  PinCodeFieldStory as PinCodeField,
  SegmentedControlStory as SegmentedControl,
}
