// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callRuntimeRpc } from '@/runtime/runtime-rpc-client'
import { introducePatchPeers } from './patch-peer-mail'
import { sidebarPatchIdentity } from './sidebar-patch-anchors'

vi.mock('@/runtime/runtime-rpc-client', () => ({ callRuntimeRpc: vi.fn() }))

function fixture(sameWorkspace = false): { root: HTMLElement; from: string; to: string } {
  const root = document.createElement('div')
  root.innerHTML =
    '<div data-worktree-host-identity="local|repo-a::worktree"><div data-patch-session-id="pane-a" data-patch-name="Design" data-patch-terminal-handle="term_a"></div></div><div data-worktree-host-identity="local|repo-b::worktree"><div data-patch-session-id="pane-b" data-patch-name="Review" data-patch-terminal-handle="term_b"></div></div>'
  const rows = root.querySelectorAll<HTMLElement>('[data-patch-session-id]')
  if (sameWorkspace) {
    root.firstElementChild?.append(rows[1])
  }
  return { root, from: sidebarPatchIdentity(rows[0])!, to: sidebarPatchIdentity(rows[1])! }
}

beforeEach(() => {
  vi.mocked(callRuntimeRpc).mockReset()
  vi.mocked(callRuntimeRpc).mockImplementation(async (_target, method, params) => {
    if (
      method === 'terminal.resolveIdentity' &&
      params &&
      typeof params === 'object' &&
      'terminal' in params
    ) {
      return { identity: { handle: params.terminal, live: true } }
    }
    return { message: { id: 'message-1' } }
  })
})

describe('patch peer introductions', () => {
  it.each([false, true])(
    'introduces distinct agents, including shared workspaces (%s)',
    async (sameWorkspace) => {
      const { root, from, to } = fixture(sameWorkspace)
      const link = await introducePatchPeers(root, from, to)
      const messages = vi
        .mocked(callRuntimeRpc)
        .mock.calls.filter((call) => call[1] === 'orchestration.send')
      expect(messages).toHaveLength(2)
      expect(messages[0][2]).toMatchObject({
        from: 'patch-bay',
        to: 'term_a',
        body: expect.stringContaining('term_b')
      })
      expect(messages[1][2]).toMatchObject({
        to: 'term_b',
        body: expect.stringContaining('term_a')
      })
      await link.disconnect?.()
      expect(
        vi.mocked(callRuntimeRpc).mock.calls.filter((call) => call[1] === 'orchestration.send')
      ).toHaveLength(4)
    }
  )

  it('does not guess among multiple agents on a workspace card', async () => {
    const { root, to } = fixture(true)
    const from = sidebarPatchIdentity(
      root.querySelector<HTMLElement>('[data-worktree-host-identity]')!
    )!
    const result = await introducePatchPeers(root, from, to)
    expect(result.note).toContain('specific agent row')
    expect(callRuntimeRpc).not.toHaveBeenCalled()
  })

  it('retains a visual-only cable across hosts without rerouting mail locally', async () => {
    const { root, from } = fixture()
    const remote = root.children[1]
    remote.setAttribute('data-worktree-host-identity', 'runtime:remote|repo-b::worktree')
    const row = remote.querySelector<HTMLElement>('[data-patch-session-id]')!
    const result = await introducePatchPeers(root, from, sidebarPatchIdentity(row)!)
    expect(result.note).toContain('cross-host')
    expect(callRuntimeRpc).not.toHaveBeenCalled()
  })

  it('sends no introductions when either identity cannot be verified', async () => {
    vi.mocked(callRuntimeRpc).mockRejectedValue(new Error('Host unavailable'))
    const { root, from, to } = fixture()
    await expect(introducePatchPeers(root, from, to)).rejects.toThrow('Host unavailable')
    expect(
      vi.mocked(callRuntimeRpc).mock.calls.every((call) => call[1] === 'terminal.resolveIdentity')
    ).toBe(true)
  })
})
