import { describe, expect, it } from 'vitest'
import { createLimiter } from './limiter'

function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('createLimiter', () => {
  it('never runs more than the limit at once', async () => {
    const run = createLimiter(2)
    const gates = [deferred(), deferred(), deferred()]
    let active = 0
    let peak = 0

    const tasks = gates.map((gate) =>
      run(async () => {
        active += 1
        peak = Math.max(peak, active)
        await gate.promise
        active -= 1
      }),
    )

    await Promise.resolve()
    expect(peak).toBe(2)

    gates.forEach((gate) => gate.resolve())
    await Promise.all(tasks)
    expect(peak).toBe(2)
  })

  it('starts a queued task once a slot frees up', async () => {
    const run = createLimiter(1)
    const order: string[] = []

    const first = run(async () => {
      order.push('first')
    })
    const second = run(async () => {
      order.push('second')
    })

    await Promise.all([first, second])
    expect(order).toEqual(['first', 'second'])
  })

  it('releases the slot when a task rejects', async () => {
    const run = createLimiter(1)

    await expect(run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    await expect(run(() => Promise.resolve('ok'))).resolves.toBe('ok')
  })
})
