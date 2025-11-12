// Minimal ambient declarations for untyped/ESM-only libs used at runtime.
// These provide basic type coverage to eliminate "Cannot find module" errors.

declare module '@opentelemetry/api' {
  export const trace: any
  export const context: any
  export const SpanStatusCode: any
  const api: any
  export = api
}

declare module '@opentelemetry/instrumentation' {
  const x: any
  export = x
}

declare module '@opentelemetry/instrumentation-express' {
  const x: any
  export = x
}

declare module '@opentelemetry/instrumentation-http' {
  const x: any
  export = x
}

declare module '@opentelemetry/instrumentation-pg' {
  const x: any
  export = x
}

declare module '@opentelemetry/instrumentation-redis-4' {
  const x: any
  export = x
}

declare module '@opentelemetry/sdk-trace-node' {
  const x: any
  export = x
}

declare module '@opentelemetry/exporter-jaeger' {
  const x: any
  export = x
}

declare module '@opentelemetry/resources' {
  const x: any
  export = x
}

declare module '@opentelemetry/semantic-conventions' {
  const x: any
  export = x
}

declare module '@sentry/node' {
  export function init(options: any): void
  export function captureException(error: any): void
  export function captureMessage(message: string): void
  export function setUser(user: any): void
  export function setTag(key: string, value: any): void
  export function setContext(key: string, context: any): void
  const x: any
  export = x
}

declare module 'winston-mongodb' {
  import { TransportStreamOptions } from 'winston-transport'

  export interface MongoDBTransportOptions extends TransportStreamOptions {
    db: string | Promise<any>
    collection?: string
    storeHost?: boolean
    label?: string
    name?: string
    capped?: boolean
    cappedSize?: number
    cappedMax?: number
    tryReconnect?: boolean
    decolorize?: boolean
    leaveConnectionOpen?: boolean
    metaKey?: string
    expireAfterSeconds?: number
  }

  export class MongoDB {
    constructor(options: MongoDBTransportOptions)
  }
}

declare module 'papaparse' {
  export interface ParseConfig {
    delimiter?: string
    newline?: string
    quoteChar?: string
    escapeChar?: string
    header?: boolean
    transformHeader?: (header: string) => string
    dynamicTyping?: boolean
    preview?: number
    encoding?: string
    worker?: boolean
    comments?: boolean | string
    step?: (results: ParseResult, parser: Parser) => void
    complete?: (results: ParseResult) => void
    error?: (error: ParseError) => void
    download?: boolean
    downloadRequestHeaders?: { [key: string]: string }
    skipEmptyLines?: boolean | 'greedy'
    chunk?: (results: ParseResult, parser: Parser) => void
    fastMode?: boolean
    beforeFirstChunk?: (chunk: string) => string | void
    withCredentials?: boolean
    transform?: (value: string) => any
    delimitersToGuess?: string[]
  }

  export interface ParseResult {
    data: any[]
    errors: ParseError[]
    meta: {
      delimiter: string
      linebreak: string
      aborted: boolean
      truncated: boolean
      cursor: number
    }
  }

  export interface ParseError {
    type: string
    code: string
    message: string
    row: number
  }

  export interface Parser {
    abort(): void
    pause(): void
    resume(): void
  }

  export function parse(input: string | File, config?: ParseConfig): ParseResult
}

declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[]
    Sheets: { [sheet: string]: WorkSheet }
  }

  export interface WorkSheet {
    [cell: string]: CellObject | any
  }

  export interface CellObject {
    v: any
    t: string
    f?: string
    r?: string
    h?: string
    w?: string
  }

  export interface ParsingOptions {
    cellFormula?: boolean
    cellHTML?: boolean
    cellNF?: boolean
    cellStyles?: boolean
    cellText?: boolean
    cellDates?: boolean
    dateNF?: string
    sheetStubs?: boolean
    sheetRows?: number
    bookDeps?: boolean
    bookFiles?: boolean
    bookProps?: boolean
    bookSheets?: boolean
    bookVBA?: boolean
    password?: string
    raw?: boolean
    type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string'
  }

  export interface WritingOptions {
    type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string'
    cellDates?: boolean
    bookSST?: boolean
    bookType?: string
    sheet?: string
    compression?: boolean
  }

  export function read(data: any, opts?: ParsingOptions): WorkBook
  export function readFile(filename: string, opts?: ParsingOptions): WorkBook
  export function write(wb: WorkBook, opts?: WritingOptions): any
  export function writeFile(wb: WorkBook, filename: string, opts?: WritingOptions): void
  export const utils: {
    sheet_to_json: (worksheet: WorkSheet, opts?: any) => any[]
    json_to_sheet: (data: any[], opts?: any) => WorkSheet
    book_new: () => WorkBook
    book_append_sheet: (wb: WorkBook, ws: WorkSheet, name: string) => void
    aoa_to_sheet: (data: any[][], opts?: any) => WorkSheet
  }
}

// Additional OpenTelemetry SDK modules
declare module '@opentelemetry/sdk-node' {
  const x: any
  export = x
}

declare module '@opentelemetry/auto-instrumentations-node' {
  const x: any
  export = x
}

declare module '@opentelemetry/exporter-trace-otlp-http' {
  const x: any
  export = x
}

declare module '@opentelemetry/exporter-metrics-otlp-http' {
  const x: any
  export = x
}

declare module '@opentelemetry/sdk-metrics' {
  const x: any
  export = x
}

declare module '@opentelemetry/sdk-trace-base' {
  const x: any
  export = x
}

// Additional Sentry modules
declare module '@sentry/profiling-node' {
  const x: any
  export = x
}

// SQLite modules for agents
declare module 'sqlite3' {
  const x: any
  export = x
}

declare module 'sqlite' {
  const x: any
  export = x
}
