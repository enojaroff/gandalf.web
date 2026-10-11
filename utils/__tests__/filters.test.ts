import { describe, expect, it } from 'vitest'
import { generateCurlSample } from '~/utils/filters'

describe('generateCurlSample', () => {
  const fields = [{ key: 'age', type: 'numeric' }, { key: 'name', type: 'string' }]

  it('calls the route v2 with the input values under data', () => {
    const sample = generateCurlSample('t1', fields)
    expect(sample).toContain('/api/v2/tables/t1/decisions')
    const body = JSON.parse(sample.slice(sample.indexOf("'") + 1, sample.lastIndexOf("'")))
    expect(body).toEqual({ data: { age: 0, name: 'value' } })
  })

  it('names the version and the variant when given', () => {
    const sample = generateCurlSample('t1', fields, '/api', { version: 3, variantId: 'v9' })
    const body = JSON.parse(sample.slice(sample.indexOf("'") + 1, sample.lastIndexOf("'")))
    expect(body).toEqual({ version: 3, variant_id: 'v9', data: { age: 0, name: 'value' } })
  })
})
