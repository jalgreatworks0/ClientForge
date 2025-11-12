/**
 * Papaparse type augmentation
 * Adds missing unparse method to papaparse types
 */

declare module 'papaparse' {
  export interface UnparseConfig {
    quotes?: boolean | boolean[] | ((value: any) => boolean)
    quoteChar?: string
    escapeChar?: string
    delimiter?: string
    header?: boolean
    newline?: string
    skipEmptyLines?: boolean | 'greedy'
    columns?: string[]
  }

  export interface UnparseObject {
    fields: string[]
    data: string[][] | Record<string, any>[]
  }

  export function unparse(data: Record<string, any>[] | string[][] | UnparseObject, config?: UnparseConfig): string

  const Papa: {
    parse: typeof parse
    unparse: typeof unparse
  }

  export default Papa
}
