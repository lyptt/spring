export interface ISpec {
  group: string
  name: string
  run: () => void
}

export interface ISpecFile {
  name: string
  groups: { [key: string]: ISpec[] }
}
