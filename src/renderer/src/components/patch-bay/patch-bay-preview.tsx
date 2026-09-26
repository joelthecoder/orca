import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Cable, GripVertical, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PatchBay } from './PatchBay'
import { SidebarPatchLayer } from './SidebarPatchLayer'
import { useSidebarPatchGesture } from './use-sidebar-patch-gesture'
import { PATCH_DEMO_CONNECTIONS, PATCH_DEMO_ENDPOINTS } from './patch-bay-demo'
import '../../assets/main.css'
import './patch-bay-preview.css'

function PatchBayPreview(): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)
  const patch = useSidebarPatchGesture(rootRef, true)
  const [items, setItems] = useState(PATCH_DEMO_ENDPOINTS)
  const [dark, setDark] = useState(true)
  const [dragged, setDragged] = useState<string | null>(null)
  return (
    <TooltipProvider>
      <div className="patch-preview-shell">
        <aside
          ref={rootRef}
          className="patch-preview-sidebar"
          data-patch-sidebar={patch.enabled ? 'true' : undefined}
        >
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
            <Cable className="size-4" />
            <strong className="text-sm">Orca / cable lab</strong>
          </div>
          <div data-worktree-sidebar-container="" className="relative min-h-0 flex-1">
            <div data-worktree-sidebar="" className="h-full overflow-auto p-2 scrollbar-sleek">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  data-worktree-id={item.id}
                  data-worktree-host-identity={`local|${item.workspace}::${item.id}`}
                  data-patch-name={item.name}
                  className="mb-3 rounded-md border border-border bg-card p-3"
                  onDragStart={() => setDragged(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (dragged && dragged !== item.id) {
                      setItems((current) => {
                        const moving = current.find((entry) => entry.id === dragged)
                        const rest = current.filter((entry) => entry.id !== dragged)
                        if (moving) {
                          rest.splice(index, 0, moving)
                        }
                        return rest
                      })
                    }
                    setDragged(null)
                  }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <GripVertical className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs font-medium">{item.name}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{item.workspace}</div>
                  <div
                    data-patch-session-id={`${item.id}-agent`}
                    data-patch-name={`${item.name} agent`}
                    className="mt-3 truncate text-xs text-muted-foreground"
                  >
                    ◉ {item.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex h-10 shrink-0 items-center justify-between border-t border-border px-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => patch.setEnabled((current) => !current)}
            >
              <Cable />
              Patch cables
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Toggle theme"
              onClick={() => {
                document.documentElement.classList.toggle('dark')
                setDark(!dark)
              }}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
          <SidebarPatchLayer rootRef={rootRef} patch={patch} visible={patch.enabled} />
        </aside>
        <main className="min-w-0 flex-1 overflow-auto scrollbar-sleek">
          <PatchBay
            endpoints={PATCH_DEMO_ENDPOINTS}
            initialConnections={PATCH_DEMO_CONNECTIONS}
            example
          />
          <p className="px-6 pb-4 text-xs text-muted-foreground">
            Sidebar: hold {navigator.userAgent.includes('Mac') ? '⌘⌥' : 'Ctrl+Alt'} and drag between
            cards. Reorder the cards to watch cables follow. These are example sessions.
          </p>
        </main>
      </div>
    </TooltipProvider>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<PatchBayPreview />)
}
