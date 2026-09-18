import { Badge } from './Badge'
import type { Department } from '../../types'

/** Badge tone per school — the same hue as that school's DEPARTMENT_ACCENT. */
const TONE: Record<Department, 'amber' | 'red' | 'blue'> = {
  SOB: 'amber', // orange accent
  SOT: 'red',
  SOE: 'blue',
}

/** School code badge, e.g. `SOT`, tinted to match the school's accent colour. */
export function DepartmentBadge({ code }: { code: Department }) {
  return <Badge tone={TONE[code]}>{code}</Badge>
}
