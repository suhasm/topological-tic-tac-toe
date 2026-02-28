import { useState, useCallback, useMemo } from 'react'
import {
  MODES,
  MODE_LABELS,
  mapToCenter,
  buildVisualGrid,
  checkWinner,
  checkDraw,
  createEmptyBoard,
} from './gameLogic'

// ── Cell Component ──────────────────────────────────────────────────────────

function Cell({ value, onClick, isCenter, isWinning, isActive, lastPlayed }) {
  const base =
    'flex items-center justify-center text-lg font-bold select-none transition-all duration-150'
  const size = 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14'

  let bg = isCenter ? 'bg-slate-100' : 'bg-white'
  if (isWinning) bg = 'bg-amber-200'
  else if (lastPlayed) bg = isCenter ? 'bg-sky-100' : 'bg-sky-50'

  const border = 'border border-slate-300'
  const cursor = isActive && !value ? 'cursor-pointer hover:bg-sky-50' : 'cursor-default'

  const textColor =
    value === 'X' ? 'text-indigo-600' : value === 'O' ? 'text-rose-500' : 'text-transparent'

  return (
    <button
      className={`${base} ${size} ${bg} ${border} ${cursor} ${textColor}`}
      onClick={onClick}
      disabled={!isActive || !!value}
      aria-label={value || 'empty'}
    >
      <span className="text-base sm:text-lg md:text-xl">{value || '\u00B7'}</span>
    </button>
  )
}

// ── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState(MODES.TORUS)
  const [centerBoard, setCenterBoard] = useState(createEmptyBoard)
  const [turn, setTurn] = useState('X')
  const [lastMove, setLastMove] = useState(null) // { col, row } on center board

  const visualGrid = useMemo(() => buildVisualGrid(centerBoard, mode), [centerBoard, mode])
  const result = useMemo(() => checkWinner(visualGrid), [visualGrid])
  const isDraw = useMemo(
    () => !result && checkDraw(centerBoard),
    [result, centerBoard]
  )

  const winningCells = useMemo(() => {
    if (!result) return new Set()
    return new Set(result.line.map(({ gx, gy }) => `${gx},${gy}`))
  }, [result])

  const handleClick = useCallback(
    (gx, gy) => {
      if (result || isDraw) return

      const mapped = mapToCenter(gx, gy, mode)
      if (!mapped) return

      const { col, row } = mapped
      if (centerBoard[row][col]) return

      const newBoard = centerBoard.map(r => [...r])
      newBoard[row][col] = turn
      setCenterBoard(newBoard)
      setLastMove({ col, row })
      setTurn(turn === 'X' ? 'O' : 'X')
    },
    [centerBoard, turn, mode, result, isDraw]
  )

  const handleReset = useCallback(() => {
    setCenterBoard(createEmptyBoard())
    setTurn('X')
    setLastMove(null)
  }, [])

  const handleModeChange = useCallback(
    (newMode) => {
      setMode(newMode)
      // Reset when mode changes to avoid confusion
      setCenterBoard(createEmptyBoard())
      setTurn('X')
      setLastMove(null)
    },
    []
  )

  // Determine which 9x9 cells correspond to lastMove
  const lastPlayedCells = useMemo(() => {
    if (!lastMove) return new Set()
    const set = new Set()
    for (let gy = 0; gy < 9; gy++) {
      for (let gx = 0; gx < 9; gx++) {
        const mapped = mapToCenter(gx, gy, mode)
        if (mapped && mapped.col === lastMove.col && mapped.row === lastMove.row) {
          set.add(`${gx},${gy}`)
        }
      }
    }
    return set
  }, [lastMove, mode])

  // Status message
  let status
  if (result) {
    status = (
      <span>
        <span className={result.winner === 'X' ? 'text-indigo-600' : 'text-rose-500'}>
          {result.winner}
        </span>{' '}
        wins!
      </span>
    )
  } else if (isDraw) {
    status = <span>Draw!</span>
  } else {
    status = (
      <span>
        Turn:{' '}
        <span className={turn === 'X' ? 'text-indigo-600' : 'text-rose-500'}>{turn}</span>
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-mono">
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1 tracking-tight">
        Topological Tic-Tac-Toe
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 mb-6">
        A symmetry sketchpad for wallpaper groups
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={mode}
          onChange={(e) => handleModeChange(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {Object.entries(MODE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-md bg-slate-200 text-slate-600 text-sm hover:bg-slate-300 transition-colors"
        >
          Reset Game
        </button>
      </div>

      {/* Status */}
      <div className="text-lg sm:text-xl font-semibold text-slate-700 mb-4">{status}</div>

      {/* 9x9 Grid */}
      <div
        className="inline-grid gap-0 border-2 border-slate-400 rounded-md overflow-hidden"
        style={{
          gridTemplateColumns: 'repeat(9, auto)',
          gridTemplateRows: 'repeat(9, auto)',
        }}
      >
        {Array.from({ length: 9 }, (_, gy) =>
          Array.from({ length: 9 }, (_, gx) => {
            const mx = Math.floor(gx / 3)
            const my = Math.floor(gy / 3)
            const isCenter = mx === 1 && my === 1
            const isActive = mode === MODES.STANDARD ? isCenter : true
            const key = `${gx},${gy}`

            // Thicker borders at macro-grid boundaries
            const borderR = gx % 3 === 2 && gx < 8 ? 'border-r-2 border-r-slate-500' : ''
            const borderB = gy % 3 === 2 && gy < 8 ? 'border-b-2 border-b-slate-500' : ''

            return (
              <div key={key} className={`${borderR} ${borderB}`}>
                <Cell
                  value={visualGrid[gy][gx]}
                  onClick={() => handleClick(gx, gy)}
                  isCenter={isCenter}
                  isWinning={winningCells.has(key)}
                  isActive={isActive && !result && !isDraw}
                  lastPlayed={lastPlayedCells.has(key)}
                />
              </div>
            )
          })
        )}
      </div>

      {/* Mode description */}
      <div className="mt-6 max-w-md text-center text-xs text-slate-400 leading-relaxed">
        <ModeDescription mode={mode} />
      </div>
    </div>
  )
}

function ModeDescription({ mode }) {
  switch (mode) {
    case MODES.STANDARD:
      return 'Standard tic-tac-toe. Only the center board is active.'
    case MODES.TORUS:
      return 'Torus (p1): Opposite edges are identified. All boards are exact clones — the plane tiles by pure translation.'
    case MODES.KLEIN:
      return 'Klein Bottle (pg): Left/right edges glue normally, but top/bottom edges glue with a horizontal flip — a glide reflection.'
    case MODES.PROJECTIVE:
      return 'Projective Plane (p2): Each pair of opposite edges glues with a flip, equivalent to a 180\u00B0 rotation at each lattice point.'
    default:
      return ''
  }
}
