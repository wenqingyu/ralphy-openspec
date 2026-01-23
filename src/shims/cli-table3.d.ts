declare module "cli-table3" {
  export type Cell = string | number | null | undefined;
  export type Row = Cell[];

  export default class Table {
    constructor(options?: {
      head?: Cell[];
      colWidths?: number[];
      wordWrap?: boolean;
    });
    push(...rows: Array<Row | { [k: string]: unknown }>): number;
    toString(): string;
  }
}

