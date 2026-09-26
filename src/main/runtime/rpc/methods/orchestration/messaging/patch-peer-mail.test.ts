import { afterEach, expect, it, vi } from 'vitest'
import { createOrchestrationRpcHarness } from '../rpc-test-harness'
import { RpcDispatcher } from '../../../dispatcher'
import { ORCHESTRATION_METHODS } from '../../orchestration'
import { desktopPeerMailEnvelope } from '../../../../../ipc/desktop-peer-mail-envelope'

const harness = createOrchestrationRpcHarness()
afterEach(() => {
  harness.cleanup()
  vi.restoreAllMocks()
})

it('accepts user-created peer introductions through the desktop dispatcher and existing inbox', async () => {
  const { runtime, db } = harness.setup(false)
  vi.mocked(runtime.getTerminalPaneKey).mockImplementation((handle) =>
    handle === 'term_a' ? 'tab_a:pane_a' : handle === 'term_b' ? 'tab_b:pane_b' : null
  )
  const dispatcher = new RpcDispatcher({ runtime, methods: ORCHESTRATION_METHODS })
  for (const to of ['term_a', 'term_b']) {
    const response = await dispatcher.dispatch(
      {
        id: `patch-${to}`,
        authToken: 'desktop-ipc',
        method: 'orchestration.send',
        ...desktopPeerMailEnvelope('orchestration.send', { from: 'patch-bay', type: 'status' }),
        params: {
          from: 'patch-bay',
          to,
          subject: 'Patch cable connected',
          body: 'Share meaningful updates with the peer.',
          type: 'status',
          priority: 'normal'
        }
      },
      { clientId: 'desktop-renderer', clientKind: 'runtime' }
    )
    expect(response, JSON.stringify(response)).toMatchObject({ ok: true })
  }
  expect(db.getInbox(20).filter((message) => message.to_handle === 'term_a')).toHaveLength(1)
  expect(db.getInbox(20).filter((message) => message.to_handle === 'term_b')).toHaveLength(1)
})
