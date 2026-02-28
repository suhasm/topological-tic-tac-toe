// ── Symmetry Modes ──────────────────────────────────────────────────────────
export const MODES = {
  STANDARD: 'standard',
  TORUS: 'torus',
  KLEIN: 'klein',
  PROJECTIVE: 'projective',
}

export const MODE_LABELS = {
  [MODES.STANDARD]: 'Standard',
  [MODES.TORUS]: 'Torus (p1)',
  [MODES.KLEIN]: 'Klein Bottle (pg)',
  [MODES.PROJECTIVE]: 'Projective Plane (p2)',
}

// ── Coordinate Mapping ──────────────────────────────────────────────────────
// The 9x9 grid is a 3x3 macro-grid of 3x3 local boards.
// macro (mx, my) in {0,1,2} identifies which board.
// local (lx, ly) in {0,1,2} identifies the cell within that board.
// The center board is macro (1,1).

/**
 * Convert a 9x9 global coordinate to macro + local coordinates.
 */
export function globalToMacroLocal(gx, gy) {
  const mx = Math.floor(gx / 3)
  const my = Math.floor(gy / 3)
  const lx = gx % 3
  const ly = gy % 3
  return { mx, my, lx, ly }
}

/**
 * Given a macro offset (dx, dy) from center (each in {-1, 0, 1}),
 * return the transformation to apply to local coordinates for that board.
 * Returns a function (lx, ly) => { col, row } mapping center-board local
 * coords to that board's local coords.
 */
function getTransform(mode, dx, dy) {
  // dx, dy: macro offset from center. dx positive = right, dy positive = down.
  switch (mode) {
    case MODES.STANDARD:
      // Only the center board is active
      if (dx === 0 && dy === 0) return (lx, ly) => ({ col: lx, row: ly })
      return null // no projection

    case MODES.TORUS:
      // Pure translation – every board is an exact clone
      return (lx, ly) => ({ col: lx, row: ly })

    case MODES.KLEIN:
      // Left/right: pure translation
      // Up/down: horizontal flip (col → 2-col)
      // Diagonal: combine
      return (lx, ly) => {
        const col = dy !== 0 ? 2 - lx : lx
        const row = ly
        return { col, row }
      }

    case MODES.PROJECTIVE:
      // Left/right: vertical flip (row → 2-row)
      // Up/down: horizontal flip (col → 2-col)
      // Diagonal: both flips = 180° rotation
      return (lx, ly) => {
        const col = dy !== 0 ? 2 - lx : lx
        const row = dx !== 0 ? 2 - ly : ly
        return { col, row }
      }

    default:
      return (lx, ly) => ({ col: lx, row: ly })
  }
}

/**
 * Given a click anywhere on the 9x9 grid, compute the canonical center-board
 * coordinate it maps to. Returns { col, row } on the center 3x3 board,
 * or null if the click is on a non-active board (Standard mode, outer boards).
 */
export function mapToCenter(gx, gy, mode) {
  const { mx, my, lx, ly } = globalToMacroLocal(gx, gy)
  const dx = mx - 1 // offset from center macro col
  const dy = my - 1 // offset from center macro row

  const transform = getTransform(mode, dx, dy)
  if (!transform) return null

  // The transform tells us: center-board coord (cx, cy) maps to (lx, ly) on
  // board (dx, dy). We need the *inverse*: given (lx, ly) on board (dx, dy),
  // find the center-board coord.
  // For our symmetries, all transforms are involutions (applying twice = identity),
  // so the inverse is the same function.
  const { col, row } = transform(lx, ly)
  return { col, row }
}

/**
 * Build the full 9x9 visual grid from the 3x3 center-board state.
 * centerBoard is a 3x3 array: centerBoard[row][col].
 * Returns a 9x9 array: grid[gy][gx].
 */
export function buildVisualGrid(centerBoard, mode) {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(null))

  for (let my = 0; my < 3; my++) {
    for (let mx = 0; mx < 3; mx++) {
      const dx = mx - 1
      const dy = my - 1
      const transform = getTransform(mode, dx, dy)

      for (let ly = 0; ly < 3; ly++) {
        for (let lx = 0; lx < 3; lx++) {
          const gx = mx * 3 + lx
          const gy = my * 3 + ly

          if (!transform) {
            grid[gy][gx] = null
            continue
          }

          // transform maps center-board coords → this board's coords.
          // We want: what center-board cell appears at (lx, ly) on this board?
          // Since transforms are involutions, invert by applying again.
          const { col, row } = transform(lx, ly)
          grid[gy][gx] = centerBoard[row][col]
        }
      }
    }
  }

  return grid
}

// ── Win Detection ───────────────────────────────────────────────────────────
// Check for 3-in-a-row across the entire 9x9 visual grid.

const DIRECTIONS = [
  { dx: 1, dy: 0 },  // horizontal
  { dx: 0, dy: 1 },  // vertical
  { dx: 1, dy: 1 },  // diagonal ↘
  { dx: 1, dy: -1 }, // diagonal ↗
]

/**
 * Check the 9x9 visual grid for any 3-in-a-row.
 * Returns 'X', 'O', or null.
 */
export function checkWinner(visualGrid) {
  for (let gy = 0; gy < 9; gy++) {
    for (let gx = 0; gx < 9; gx++) {
      const cell = visualGrid[gy][gx]
      if (!cell) continue

      for (const { dx, dy } of DIRECTIONS) {
        const x1 = gx + dx, y1 = gy + dy
        const x2 = gx + 2 * dx, y2 = gy + 2 * dy

        if (x2 < 0 || x2 >= 9 || y2 < 0 || y2 >= 9) continue

        if (visualGrid[y1]?.[x1] === cell && visualGrid[y2]?.[x2] === cell) {
          return {
            winner: cell,
            line: [
              { gx, gy },
              { gx: x1, gy: y1 },
              { gx: x2, gy: y2 },
            ],
          }
        }
      }
    }
  }

  return null
}

/**
 * Check if the game is a draw (all center-board cells filled, no winner).
 */
export function checkDraw(centerBoard) {
  return centerBoard.every(row => row.every(cell => cell !== null))
}

/**
 * Create an empty 3x3 board.
 */
export function createEmptyBoard() {
  return Array.from({ length: 3 }, () => Array(3).fill(null))
}
