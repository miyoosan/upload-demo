self.importScripts('./md5.umd.min.js')

class WorkerPool {
  #workers = []
  push(worker) {
    this.#workers.push(worker)
  }
  get() {
    if (this.#workers.length) return this.#workers.pop()
  }
  clear() {
    this.#workers = []
  }
}
class OrderedQueue {
  #current = 0
  #max = 0
  #queue = {}
  #end = () => {}
  init(max) {
    this.#max = max
  }
  add(fn, index) {
    this.#queue[index] = fn
  }
  async run() {
    let next = this.#queue[this.#current]
    if (next) {
      await next()
      next = null
      delete this.#queue[this.#current]
      this.#current++
      return await this.run()
    } else if (this.#current >= this.#max) {
      this.reset()
      this.#end()
      return
    }
  }
  reset() {
    this.#current = 0
    this.#max = 0
    this.#queue = {}
  }
  set onend(fn) {
    this.#end = fn
  }
}

onmessage = function(e) {
  hashFile(e.data.file, e.data.chunkSize, e.data.maxWorkerNum).then(hash =>
    postMessage(hash)
  )
}

let hasher
const workerPool = new WorkerPool()

async function hashFile(file, chunkSize = 64 * 1024 * 1024, maxWorkerNum = 2) {
  if (hasher) {
    hasher.init()
  } else {
    hasher = await self.hashwasm.createMD5()
  }
  await updateHasher(file, chunkSize, maxWorkerNum)
  const hash = hasher.digest()
  return hash
}

function updateHasher(file, chunkSize, maxWorkerNum) {
  return new Promise(resolve => {
    const orderedQueue = new OrderedQueue()
    const maxChunk = Math.floor(file.size / chunkSize)
    orderedQueue.init(maxChunk + 1)
    orderedQueue.onend = () => {
      workerPool.clear()
      resolve()
    }
    const maxParallel = Math.min(maxWorkerNum, maxChunk)
    for (let i = 0; i <= maxParallel; i++) {
      readBlob(i)
    }
    function readBlob(i) {
      const worker = workerPool.get() || new Worker('./buffer-worker.js')
      const blob = sliceFile(file, i, chunkSize)
      worker.postMessage(blob)
      worker.onmessage = e => {
        workerPool.push(worker)
        nextRound(i + 1 + maxWorkerNum)
        orderedQueue.add(() => hasher.update(new Uint8Array(e.data)), i)
        orderedQueue.run()
      }
    }
    function nextRound(i) {
      if (i <= maxChunk) {
        readBlob(i)
      }
    }
  })
}

const blobSlice =
  File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice
function sliceFile(file, i, chunkSize) {
  const start = i * chunkSize
  const end = Math.min(start + chunkSize, file.size)
  const blob = blobSlice.call(file, start, end)
  return blob
}
