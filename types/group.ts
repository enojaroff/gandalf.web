export interface Group {
  _id: string
  title: string
  description?: string
  tables?: GroupTable[]
}

export interface GroupTable {
  _id: string
  title: string
  description?: string
}
