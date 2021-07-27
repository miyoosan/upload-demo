onmessage = async function(e) {
  const buffer = await readBuffer(e.data)
  postMessage(buffer, [buffer])
}

const fileReader = new FileReader()
function readBuffer(chunk) {
  return new Promise((resolve, reject) => {
    fileReader.onload = e => resolve(e.target.result)
    fileReader.onerror = e => reject(e)
    fileReader.readAsArrayBuffer(chunk)
  })
}
