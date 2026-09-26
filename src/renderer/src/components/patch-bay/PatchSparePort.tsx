import type { PatchPoint } from './patch-bay-model'

export function PatchSparePort({
  point,
  label,
  onClick
}: {
  point: PatchPoint
  label?: string
  onClick?: () => void
}): React.JSX.Element {
  const style = { left: point.x - 6, top: point.y + 4 }
  return onClick ? (
    <button
      type="button"
      className="patch-add-jack"
      style={style}
      aria-label={label}
      onClick={onClick}
    >
      <span />
    </button>
  ) : (
    <span className="patch-add-jack" style={style} aria-hidden="true">
      <span />
    </span>
  )
}
