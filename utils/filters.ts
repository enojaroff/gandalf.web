// Équivalents TypeScript des filtres AngularJS

export function formatJson(value: unknown, indent = 2): string {
  return JSON.stringify(value, null, indent)
}

export function toFixed(value: number | string, digits = 2): string {
  return Number(value).toFixed(digits)
}

export function formatBoolean(value: unknown): string {
  return value ? 'Yes' : 'No'
}

export function joinArray(arr: unknown[], separator = ', '): string {
  return Array.isArray(arr) ? arr.join(separator) : String(arr)
}

export function lastItem<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1]
}

export function mapArray<T, R>(arr: T[], key: keyof T): R[] {
  return arr.map(item => item[key] as unknown as R)
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength) + '...'
}

export function filterEmpty<T>(arr: T[]): T[] {
  return arr.filter(item => item !== null && item !== undefined && item !== '')
}

export function generateCurlSample(
  tableId: string,
  fields: Array<{ key: string; type: string }>,
  baseUrl = '/api',
): string {
  const body = fields.reduce(
    (acc, field) => {
      acc[field.key] = field.type === 'numeric' ? 0 : 'value'
      return acc
    },
    {} as Record<string, unknown>,
  )

  return `curl -X POST ${baseUrl}/v1/tables/${tableId}/decisions \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body, null, 2)}'`
}

// Génère un ObjectId-like (utilisé pour les IDs locaux)
export function objectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0')
  const randomPart = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('')
  return timestamp + randomPart
}

// Hash simple pour détecter les changements
export function stringHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash
}

export function orNull<T>(value: T | null | undefined): T | null {
  return value ?? null
}
