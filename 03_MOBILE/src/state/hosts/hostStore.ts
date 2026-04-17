import { HostItem } from '@/models/host'

export type HostStore = {
  items: HostItem[]
  setItems(items: HostItem[]): void
  clearToken(url: string): void
}

export function createHostStore(items: HostItem[] = []): HostStore {
  return {
    items,
    setItems(next) {
      this.items = next
    },
    clearToken(url) {
      this.items = this.items.map((item) =>
        item.url === url ? { ...item, tokenState: 'missing' } : item,
      )
    },
  }
}
