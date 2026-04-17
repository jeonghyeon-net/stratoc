import { SessionItem } from '@/models/session'

export type SessionStore = {
  items: SessionItem[]
  setItems(items: SessionItem[]): void
}

export function createSessionStore(items: SessionItem[] = []): SessionStore {
  return {
    items,
    setItems(next) {
      this.items = next
    },
  }
}
