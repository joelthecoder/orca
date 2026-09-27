import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test, expect } from './helpers/orca-app'
import { waitForSessionReady } from './helpers/store'
import { runProcess } from '../../src/shared/child-process/run-process'
import { RuntimeClient } from '../../src/cli/runtime-client'
import type { PatchCommandResult } from '../../src/shared/patch-cable-command'

test.use({ seedTestRepo: false })

test('patches across repositories and keeps the cable attached after layout and zoom changes', async ({
  orcaPage: page,
  electronApp,
  registerPostElectronShutdownCleanup
}, testInfo) => {
  await waitForSessionReady(page)
  await electronApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1280, 900)
  )
  await page.setViewportSize({ width: 1280, height: 900 })
  const fixtureRoot = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'orca-patch-')))
  registerPostElectronShutdownCleanup(async () => {
    rmSync(fixtureRoot, { recursive: true, force: true })
  })
  const repos = ['cable-design', 'agent-inbox'].map((name) => path.join(fixtureRoot, name))
  for (const repoPath of repos) {
    mkdirSync(repoPath)
    writeFileSync(path.join(repoPath, 'README.md'), '# Patch cable fixture\n')
    for (const args of [
      ['init'],
      ['add', '.'],
      [
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.com',
        '-c',
        'commit.gpgsign=false',
        'commit',
        '-m',
        'Seed fixture'
      ]
    ]) {
      const result = await runProcess({ program: 'git', args, cwd: repoPath, timeoutMs: 10000 })
      expect(result.code, result.stderr).toBe(0)
    }
  }
  await page.evaluate(async (paths) => {
    const store = window.__store!
    for (const repoPath of paths) {
      await window.api.repos.add({ path: repoPath })
    }
    await store.getState().awaitLocalRepoCatalogSettlement()
    for (const repo of store.getState().repos) {
      await store.getState().fetchWorktrees(repo.id)
    }
    store.getState().setGroupBy('repo')
    store.getState().setSidebarWidth(380)
  }, repos)
  const rows = page.locator('[data-worktree-sidebar] [data-worktree-host-identity]')
  await expect(rows).toHaveCount(2)
  const source = await rows.nth(0).boundingBox()
  if (!source) {
    throw new Error('Source card was not rendered')
  }
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
  await page.keyboard.down(modifier)
  await page.keyboard.down('Alt')
  await page.mouse.move(source.x + 45, source.y + 22)
  await page.mouse.down()
  await expect(page.locator('[data-sidebar-patch-layer]')).toBeVisible()
  const socketAlignment = () =>
    page.evaluate(() => {
      const rows = [
        ...document.querySelectorAll<HTMLElement>(
          '[data-worktree-sidebar] [data-worktree-host-identity]'
        )
      ]
      return rows.map((row) => {
        const marker = row.querySelector('[data-patch-socket-anchor]')!.getBoundingClientRect()
        const id = JSON.stringify(['workspace', row.dataset.worktreeHostIdentity])
        const port = [...document.querySelectorAll<HTMLElement>('[data-sidebar-patch-port]')]
          .find((element) => element.dataset.sidebarPatchPort === id)!
          .getBoundingClientRect()
        return Math.hypot(
          marker.left + marker.width / 2 - port.left - port.width / 2,
          marker.top + marker.height / 2 - port.top - port.height / 2
        )
      })
    })
  await expect.poll(async () => Math.max(...(await socketAlignment()))).toBeLessThan(1)
  const target = await rows.nth(1).boundingBox()
  if (!target) {
    throw new Error('Target card was not rendered')
  }
  await page.mouse.move(target.x + 50, target.y + 22, { steps: 12 })
  await expect(page.locator('.sidebar-patch-layer .patch-cable[opacity="0.42"]')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('patch-ghost.png') })
  await page.mouse.up()
  await page.keyboard.up('Alt')
  await page.keyboard.up(modifier)
  await expect
    .poll(() =>
      electronApp.windows().some((window) => window.url().includes('patch-cable-overlay.html'))
    )
    .toBe(true)
  const overlay = electronApp
    .windows()
    .find((window) => window.url().includes('patch-cable-overlay.html'))
  if (!overlay) {
    throw new Error('Patch cable companion did not load')
  }
  const cable = overlay.locator('.patch-cable[opacity="1"]')
  await expect(cable).toHaveCount(1)
  await expect(overlay.locator('canvas[data-rendered="true"]')).toHaveCount(1)
  const sparePorts = page.getByRole('button', { name: /^Add cable to / })
  await expect(sparePorts).toHaveCount(2)
  await expect(overlay.locator('.patch-add-jack')).toHaveCount(2)
  await sparePorts.first().click()
  await expect(page.locator('.sidebar-patch-status')).toContainText('Choose another jack')
  await page.keyboard.press('Escape')
  await expect(page.locator('.sidebar-patch-status')).toContainText('1 cable')
  const before = await cable.locator('.patch-cable-body').getAttribute('d')
  // Expanding content must not move the socket away from the name/status line.
  await rows.nth(0).evaluate((row) => {
    const extra = document.createElement('div')
    extra.style.height = '70px'
    row.appendChild(extra)
  })
  await expect.poll(async () => Math.max(...(await socketAlignment()))).toBeLessThan(1)
  await expect(cable.locator('.patch-cable-body')).toHaveAttribute('d', before!)
  await rows.nth(0).evaluate((row) => {
    row.style.paddingTop = '30px'
    row.style.paddingLeft = '96px'
  })
  await expect.poll(() => cable.locator('.patch-cable-body').getAttribute('d')).not.toBe(before)
  await expect(cable).toHaveCount(1)
  await expect.poll(async () => Math.max(...(await socketAlignment()))).toBeLessThan(1)
  await expect.poll(() => overlay.evaluate(() => window.innerWidth)).toBeGreaterThan(176)
  const windows = await electronApp.evaluate(({ BrowserWindow }) => {
    const companion = BrowserWindow.getAllWindows().find(
      (window) => window.getTitle() === 'Orca patch cables'
    )
    const parent = companion?.getParentWindow()
    if (!companion || !parent) {
      throw new Error('Missing attached patch window')
    }
    const before = parent.getBounds()
    parent.setPosition(before.x + 20, before.y + 10)
    return { hidden: !companion.isVisible(), parentId: parent.id, companionId: companion.id }
  })
  expect(windows.hidden).toBe(true)
  expect(windows.parentId).not.toBe(windows.companionId)
  await electronApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()
      .find((window) => !window.isDestroyed())
      ?.webContents.setZoomFactor(1.25)
  })
  await expect(cable).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('patch-connected.png') })
  await overlay.screenshot({ path: testInfo.outputPath('patch-outside.png'), omitBackground: true })
  await page.getByRole('button', { name: 'Unplug all', exact: true }).click()
  await expect(cable).toHaveCount(0)
  await expect(sparePorts).toHaveCount(0)
  await expect(overlay.locator('.patch-add-jack')).toHaveCount(0)
  const userDataDir = await electronApp.evaluate(({ app }) => app.getPath('userData'))
  const client = new RuntimeClient(userDataDir, 30_000, null, null)
  const listed = await client.call<PatchCommandResult>('patch.command', { action: 'list' })
  const [from, to] = listed.result.endpoints
  const connected = await client.call<PatchCommandResult>('patch.command', {
    action: 'connect',
    from: from.id,
    to: to.id,
    color: 'purple'
  })
  expect(connected.result.mail).toBe('visual-only')
  await expect(cable).toHaveAttribute('data-patch-color', 'purple')
  await expect(page.locator('.sidebar-patch-status')).toContainText('1 cable')
  await client.call('patch.command', { action: 'disconnect', from: from.id, to: to.id })
  await expect(cable).toHaveCount(0)
})
