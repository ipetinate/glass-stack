import { InvertedGauge, RadialDonut, Sparkline } from '@/core/components/charts'
import { Widget } from '@/modules/dashboard/components/Widget/Widget'

const storageCharts = [
  {
    label: '[D:] WORK DRIVE',
    value: '148GB / 1 TB',
    chartValue: 50,
    startAngle: 0,
  },
  {
    label: '[F:] Documents',
    value: '14GB / 50GB',
    chartValue: 72,
    startAngle: 255,
  },
  { label: '[G:] root', value: '42GB / 2TB', chartValue: 26, startAngle: 180 },
  {
    label: '[W:] Disc Unit',
    value: '4.6GB',
    chartValue: 82,
    startAngle: 0,
    striped: true,
  },
]

const throughputGroups = [
  {
    label: 'STORAGE DRIVE',
    lines: [
      {
        label: 'READ',
        color: '#7df4ad',
        data: [22, 23, 24, 30, 26, 42, 35, 50, 50, 58],
      },
      {
        label: 'WRITE',
        color: '#b27aff',
        data: [10, 10, 35, 35, 9, 9, 28, 25, 7, 7],
      },
    ],
  },
  {
    label: 'MEMORY',
    lines: [
      {
        label: 'READ',
        color: '#f3ff4f',
        data: [28, 35, 24, 38, 42, 20, 20, 54, 68, 25, 34, 32, 22],
      },
      {
        label: 'WRITE',
        color: '#ff83d6',
        data: [20, 28, 23, 34, 32, 44, 63, 50, 55, 52, 49, 68, 55, 66],
      },
    ],
  },
  {
    label: 'NETWORK',
    lines: [
      {
        label: 'DOWNLOAD',
        color: '#ff6b6b',
        data: [30, 30, 55, 53, 25, 25, 25, 74, 70, 20, 20, 38, 35, 22],
      },
      {
        label: 'UPLOAD',
        color: '#7ee8ff',
        data: [20, 20, 31, 31, 39, 40, 48, 48, 58, 60, 65, 65],
      },
    ],
  },
]

export function DashboardPage() {
  return (
    <div className=" w-full h-full grid grid-cols-8 grid-rows-9 gap-8">
      <Widget
        icon="HardDrive"
        title="Storage"
        className="col-span-4 row-span-3"
      >
        <div className="flex h-full min-h-0 w-full items-center justify-around gap-5">
          {storageCharts.map((item) => (
            <div
              key={item.label}
              className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-3"
            >
              <RadialDonut
                className="aspect-square w-full max-w-[100px] shrink"
                size={100}
                gap={10}
                startAngle={item.startAngle}
                endAngle={item.startAngle + 360}
                value={item.chartValue}
                animation={false}
                color="#9bd0ff"
                striped={item.striped}
              />
              <div className="text-center">
                <p className="text-xs font-medium text-white/80">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Widget>

      <Widget
        icon="SquareStack"
        title="Applications"
        className="col-span-4 row-span-5"
      >
        <div className="flex items-start pt-8">
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#070b1f]">
              <div className="h-8 w-8 rounded-full border-[5px] border-[#8fbfff] border-b-[#40d7ff] border-l-[#40d7ff]" />
            </div>
            <p className="text-xs font-semibold text-white">Jellyfin</p>
          </div>
        </div>
      </Widget>

      <Widget
        icon="ThermometerSnowflake"
        title="Temperature"
        className="col-span-4 row-span-3"
      >
        <div className="grid h-full min-h-0 w-full grid-cols-2 items-center gap-6 overflow-hidden">
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <p className="text-xs font-bold text-[#b7cae7]">CPU</p>
            <div className="min-h-0 flex-1">
              <InvertedGauge
                className="mx-auto h-full max-h-full w-auto max-w-full"
                width={220}
                height={126}
                statusLabel="Medium"
                statusColor="#d6bd75"
                value={58}
                unit="°C"
                color={{
                  type: 'linear',
                  stops: [
                    { offset: '0%', color: '#9bd0ff' },
                    { offset: '60%', color: '#ffb02f' },
                    { offset: '100%', color: '#ff5a4d' },
                  ],
                }}
                animation={false}
              />
            </div>
          </div>
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <p className="text-xs font-bold text-[#b7cae7]">GPU</p>
            <div className="min-h-0 flex-1">
              <InvertedGauge
                className="mx-auto h-full max-h-full w-auto max-w-full"
                width={220}
                height={126}
                statusLabel="High"
                statusColor="#ff856e"
                value={76}
                unit="°C"
                color={{
                  type: 'linear',
                  stops: [
                    { offset: '0%', color: '#bfefff' },
                    { offset: '55%', color: '#ffb02f' },
                    { offset: '100%', color: '#ff5a4d' },
                  ],
                }}
                animation={false}
              />
            </div>
          </div>
        </div>
      </Widget>

      <Widget
        icon="Compass"
        title="Shortcuts"
        className="col-span-4 row-span-4"
      >
        Dashboard Content
      </Widget>

      <Widget
        icon="Activity"
        title="Input / Output"
        className="col-span-4 row-span-3"
      >
        <div className="grid h-full w-full grid-cols-3 items-end gap-4">
          {throughputGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-3">
              <p className="text-xs font-bold text-[#b7cae7]">{group.label}</p>
              {group.lines.map((line) => (
                <div key={line.label} className="flex flex-col gap-1">
                  <p className="text-[9px] uppercase text-white/70">
                    {line.label}
                  </p>
                  <Sparkline
                    data={line.data}
                    height={42}
                    width={200}
                    strokeWidth={1.4}
                    color={line.color}
                    fill={line.color}
                    fillOpacity={0.2}
                    endpointRadius={2}
                    animation={false}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Widget>
    </div>
  )
}
