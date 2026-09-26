import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PATCH_COLORS, type PatchColor } from './patch-bay-model'

export function PatchColorPicker({
  color,
  onChange
}: {
  color: PatchColor
  onChange: (color: PatchColor) => void
}): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" aria-label={`Cable color: ${color}`}>
          <Palette />
          <span className="patch-connection-dot" style={{ background: `var(--patch-${color})` }} />
          Color
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <p className="mb-3 text-xs font-medium">Cable jacket</p>
        <div className="grid grid-cols-6 gap-2" role="group" aria-label="Cable color">
          {PATCH_COLORS.map((item) => (
            <button
              key={item}
              type="button"
              className="patch-swatch"
              style={{ color: `var(--patch-${item})` }}
              aria-label={`${item} cable`}
              aria-pressed={color === item}
              onClick={() => onChange(item)}
            >
              <span />
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs capitalize text-muted-foreground">{color}</p>
      </PopoverContent>
    </Popover>
  )
}
