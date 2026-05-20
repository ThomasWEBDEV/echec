const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 }

function evaluate(board, turn, isGameOver, isCheckmate, isDraw) {
  if (isCheckmate) return turn === 'w' ? -99999 : 99999
  if (isDraw) return 0
  let score = 0
  board.flat().forEach((piece) => {
    if (!piece) return
    score += piece.color === 'w' ? PIECE_VALUE[piece.type] : -PIECE_VALUE[piece.type]
  })
  return score
}

self.onmessage = function(e) {
  const { fen, depth } = e.data

  // Importer chess.js depuis CDN dans le worker
  importScripts('https://cdn.jsdelivr.net/npm/chess.js@1.0.0/dist/cjs/chess.js')

  const chess = new Chess(fen)
  const moves = chess.moves({ verbose: true })
  if (moves.length === 0) { self.postMessage(null); return }

  moves.sort(() => Math.random() - 0.5)

  function minimax(d, alpha, beta, isMax) {
    if (d === 0 || chess.isGameOver()) {
      return evaluate(
        chess.board(),
        chess.turn(),
        chess.isGameOver(),
        chess.isCheckmate(),
        chess.isDraw(),
      )
    }
    const ms = chess.moves({ verbose: true })
    if (isMax) {
      let best = -Infinity
      for (const m of ms) {
        chess.move(m)
        best = Math.max(best, minimax(d - 1, alpha, beta, false))
        chess.undo()
        alpha = Math.max(alpha, best)
        if (beta <= alpha) break
      }
      return best
    } else {
      let best = Infinity
      for (const m of ms) {
        chess.move(m)
        best = Math.min(best, minimax(d - 1, alpha, beta, true))
        chess.undo()
        beta = Math.min(beta, best)
        if (beta <= alpha) break
      }
      return best
    }
  }

  const isBlack = chess.turn() === 'b'
  let bestMove = moves[0]
  let bestScore = isBlack ? Infinity : -Infinity

  for (const move of moves) {
    chess.move(move)
    const score = minimax(depth - 1, -Infinity, Infinity, !isBlack)
    chess.undo()
    if (isBlack ? score < bestScore : score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  self.postMessage(bestMove)
}
