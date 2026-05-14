// ============================================================
// STOCKFISH WORKER — tourne dans un thread séparé
// Évite de bloquer l'interface pendant que l'IA calcule
// ============================================================

let stockfish: Worker | null = null

// Charger Stockfish WASM
async function initStockfish() {
  stockfish = new Worker('/stockfish/stockfish.js')
  stockfish.postMessage('uci')
  stockfish.postMessage('isready')
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data

  switch (type) {
    case 'init':
      await initStockfish()
      break

    case 'move': {
      const { fen, depth, thinkTimeMs } = payload
      if (!stockfish) return

      stockfish.postMessage(`position fen ${fen}`)
      stockfish.postMessage(`go depth ${depth} movetime ${thinkTimeMs}`)

      stockfish.onmessage = (msg: MessageEvent) => {
        const line: string = msg.data
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ')
          const move = parts[1]
          if (move && move !== '(none)') {
            self.postMessage({
              type: 'bestmove',
              payload: {
                from: move.slice(0, 2),
                to: move.slice(2, 4),
                promotion: move.length === 5 ? move[4] : undefined,
              },
            })
          }
        }
      }
      break
    }

    case 'stop':
      stockfish?.postMessage('stop')
      break

    case 'quit':
      stockfish?.postMessage('quit')
      stockfish?.terminate()
      stockfish = null
      break
  }
}
