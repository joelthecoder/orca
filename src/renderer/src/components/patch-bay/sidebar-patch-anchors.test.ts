// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readSidebarPatchAnchors, sidebarPatchIdentity } from './sidebar-patch-anchors'
import { connectPatch } from './patch-bay-model'
import { isPatchDragModifier } from './use-sidebar-patch-gesture'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('sidebar patch identity and geometry', () => {
  it('places agent sockets beside their own row through indentation and zoom changes', () => {
    const root = document.createElement('div')
    document.body.append(root)
    Object.defineProperties(root, { clientWidth: { value: 340 }, clientHeight: { value: 800 } })
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 680, 1600))
    root.innerHTML =
      '<div data-worktree-host-identity="local|repo"><div data-patch-session-id="pane"></div></div>'
    const workspace = root.children[0]
    const agent = workspace.children[0]
    vi.spyOn(workspace, 'getBoundingClientRect').mockReturnValue(new DOMRect(120, 150, 640, 200))
    const row = vi
      .spyOn(agent, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(188, 250, 540, 48))
    const anchor = () => readSidebarPatchAnchors(root).anchors.find((a) => a.id.includes('session'))
    expect(anchor()).toMatchObject({ x: 36, y: 112 })
    row.mockReturnValue(new DOMRect(212, 350, 516, 48))
    expect(anchor()).toMatchObject({ x: 48, y: 162 })
  })

  it('retains connections across repo boundaries, reordering, and temporary unmounts', () => {
    const root = document.createElement('div')
    document.body.append(root)
    Object.defineProperties(root, { clientWidth: { value: 340 }, clientHeight: { value: 800 } })
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 340, 800))
    root.innerHTML =
      '<div data-worktree-host-identity="local|repo-a::worktree"><div data-patch-session-id="pane-a"></div></div><div data-worktree-host-identity="ssh:devbox|repo-b::worktree"></div>'
    const first = root.children[0]
    const second = root.children[1]
    let firstY = 100
    let secondY = 300
    vi.spyOn(first, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, firstY, 260, 70)
    )
    vi.spyOn(second, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, secondY, 260, 70)
    )
    const before = readSidebarPatchAnchors(root).anchors
    const connections = connectPatch([], before[0].id, before[1].id, 'purple')
    root.prepend(second)
    firstY = 350
    secondY = 90
    const after = readSidebarPatchAnchors(root).anchors
    expect(after.find((a) => a.id === connections[0].from)?.y).toBe(373)
    expect(after.find((a) => a.id === connections[0].to)?.y).toBe(113)
    first.remove()
    expect(readSidebarPatchAnchors(root).anchors).toHaveLength(1)
    root.append(first)
    expect(
      readSidebarPatchAnchors(root).anchors.find((a) => a.id === connections[0].from)
    ).toBeDefined()
  })

  it('separates identical workspace and pane ids on different hosts', () => {
    const local = document.createElement('div')
    const remote = document.createElement('div')
    local.dataset.worktreeHostIdentity = 'local|repo::path'
    remote.dataset.worktreeHostIdentity = 'ssh:devbox|repo::path'
    local.dataset.patchSessionId = remote.dataset.patchSessionId = 'same-pane'
    expect(sidebarPatchIdentity(local)).not.toBe(sidebarPatchIdentity(remote))
    delete local.dataset.patchSessionId
    expect(sidebarPatchIdentity(local)).toContain('workspace')
  })

  it('deduplicates reverse connections and refuses self connections', () => {
    const connections = connectPatch([], 'a', 'b', 'black')
    expect(connectPatch(connections, 'b', 'a', 'red')).toBe(connections)
    expect(connectPatch(connections, 'a', 'a', 'blue')).toBe(connections)
  })

  it('keeps ordinary dragging free and uses the platform modifier', () => {
    const modifiers = { metaKey: true, ctrlKey: false, altKey: true, shiftKey: false }
    expect(isPatchDragModifier(modifiers, true)).toBe(true)
    expect(isPatchDragModifier(modifiers, false)).toBe(false)
    expect(isPatchDragModifier({ ...modifiers, metaKey: false, ctrlKey: true }, false)).toBe(true)
    expect(isPatchDragModifier({ ...modifiers, altKey: false }, true)).toBe(false)
  })
})
