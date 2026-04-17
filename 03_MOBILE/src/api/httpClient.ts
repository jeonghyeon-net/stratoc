export type HttpClient = {
  get<T>(path: string, token?: string): Promise<T>
  post<T>(path: string, body: unknown, token?: string): Promise<T>
  delete(path: string, token?: string): Promise<void>
}
