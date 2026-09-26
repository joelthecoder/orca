import type { PatchConnection, PatchEndpoint } from './patch-bay-model'

export const PATCH_DEMO_ENDPOINTS: PatchEndpoint[] = [
  {
    id: 'design',
    name: 'Patch cable exploration',
    workspace: 'orca / sandtiger',
    detail: 'Codex · UI design',
    kind: 'session'
  },
  {
    id: 'review',
    name: 'Design review',
    workspace: 'orca / cuttlefish',
    detail: 'Claude · Review',
    kind: 'session'
  },
  {
    id: 'inbox',
    name: 'Agent messaging',
    workspace: 'orca / nautilus',
    detail: 'Codex · Inbox transport',
    kind: 'session'
  },
  {
    id: 'tests',
    name: 'Integration tests',
    workspace: 'orca / bluefin',
    detail: 'Claude · Verification',
    kind: 'session'
  },
  {
    id: 'notes',
    name: 'Product notes',
    workspace: 'Local folder',
    detail: 'Folder workspace',
    kind: 'folder'
  },
  {
    id: 'ssh',
    name: 'Remote runtime',
    workspace: 'orca / reef',
    detail: 'Codex · SSH / devbox',
    kind: 'session'
  }
]

export const PATCH_DEMO_CONNECTIONS: PatchConnection[] = [
  { from: 'design', to: 'tests', color: 'orange' },
  { from: 'inbox', to: 'review', color: 'blue' },
  { from: 'notes', to: 'ssh', color: 'lime' }
]
