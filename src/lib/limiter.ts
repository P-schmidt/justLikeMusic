/**
 * Runs at most `limit` tasks at once. Decoding and beat detection are heavy, so
 * queuing them keeps the UI interactive when a whole folder is dropped in.
 */
export function createLimiter(limit: number) {
  let active = 0
  const waiting: (() => void)[] = []

  function release() {
    active -= 1
    waiting.shift()?.()
  }

  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        active += 1
        task().then(resolve, reject).finally(release)
      }

      if (active < limit) {
        start()
      } else {
        waiting.push(start)
      }
    })
  }
}
