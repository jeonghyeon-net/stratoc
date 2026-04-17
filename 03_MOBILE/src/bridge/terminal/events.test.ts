import { TerminalSessionEvent } from './types'

it('supports certificate changed event', () => {
  const event: TerminalSessionEvent = {
    type: 'certificate-changed',
    hostUrl: 'https://10.0.0.2:8443',
  }
  expect(event.type).toBe('certificate-changed')
})
