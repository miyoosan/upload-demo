self.importScripts('./md5.umd.min.js')

const createMD5 = self.hashwasm.createMD5

onmessage = function(e) {
  hashFile(e.data.file, e.data.chunkSize).then(hash => postMessage(hash))
}

let hasher
async function hashFile(file, chunkSize = 64 * 1024 * 1024) {
  if (hasher) {
    hasher.init()
  } else {
    hasher = await createMD5()
  }
  const maxChunk = Math.floor(file.size / chunkSize)
  for (let i = 0; i <= maxChunk; i++) {
    const blob = sliceFile(file, chunkSize, i)
    const buffer = await readBuffer(blob)
    hasher.update(new Uint8Array(buffer))
  }
  const hash = hasher.digest()
  return Promise.resolve(hash)
}

function sliceFile(file, chunkSize, i) {
  const blobSlice =
    File.prototype.slice ||
    File.prototype.mozSlice ||
    File.prototype.webkitSlice
  const start = i * chunkSize
  const end = Math.min(start + chunkSize, file.size)
  const blob = blobSlice.call(file, start, end)
  return blob
}

const fileReader = new FileReader()
function readBuffer(chunk) {
  return new Promise((resolve, reject) => {
    fileReader.onload = e => resolve(e.target.result)
    fileReader.onerror = e => reject(e)
    fileReader.readAsArrayBuffer(chunk)
  })
}
