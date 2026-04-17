import React from 'react'
import { render } from '@testing-library/react-native'
import { HostListScreen } from './HostListScreen'

it('renders merged host row', () => {
  const item = {
    id: 'https://10.0.0.2:8443',
    label: '# 10.0.0.2:8443',
    url: 'https://10.0.0.2:8443',
    status: '자동 감지',
    tokenState: 'cached' as const,
    source: { saved: false, defaultConfigured: false, discovered: true },
  }
  const screen = render(
    <HostListScreen items={[item]} onRefresh={() => {}} onOpen={() => {}} />,
  )
  expect(screen.getByText('# 10.0.0.2:8443')).toBeTruthy()
  expect(screen.getByText('자동 감지')).toBeTruthy()
})
