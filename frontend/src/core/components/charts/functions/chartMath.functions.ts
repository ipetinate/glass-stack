export type Point = {
  x: number
  y: number
}

/** Keeps chart inputs inside their declared domain before D3 path generation. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function getPercent(value: number, min: number, max: number) {
  if (max === min) return 0

  return clamp((value - min) / (max - min), 0, 1)
}

export function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): Point {
  const angleInRadians = degreesToRadians(angleInDegrees - 90)

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

export function getValueAngle(
  value: number,
  min: number,
  max: number,
  startAngle: number,
  endAngle: number,
) {
  return startAngle + (endAngle - startAngle) * getPercent(value, min, max)
}
