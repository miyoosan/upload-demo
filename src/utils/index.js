let scheduler
let workerPool

// 多文件哈希
export function hashFiles({
  files,
  onhash,
  chunkSize,
  globalMaxHashWorkerNum,
  maxParallelWorkerNum,
  parallel,
}) {
  if (!scheduler) {
    scheduler = createScheduler(globalMaxHashWorkerNum)
  }
  if (!workerPool) {
    workerPool = createWorkerPool()
  }
  return new Promise(resolve => {
    const md5Files = []
    files.forEach((file, index) => {
      const task = async () => {
        file.hash = await _hashFile(file.file)
        typeof onhash === 'function' && onhash(file.hash, file, index)
        md5Files[index] = file
      }
      // 入队
      scheduler.queue(task)
    })
    // 启动计算
    scheduler.start()
    // 结束计算
    scheduler.onend = () => {
      workerPool.destroy()
      resolve(md5Files)
    }
    // 计算文件哈希
    function _hashFile(file) {
      return new Promise(resolve => {
        const hashWorker =
          workerPool.get() ||
          new Worker(parallel ? './parallel-worker.js' : './serial-worker.js')
        hashWorker.postMessage({
          file,
          chunkSize,
          maxWorkerNum: maxParallelWorkerNum,
        })
        hashWorker.onmessage = e => {
          workerPool.push(hashWorker)
          resolve(e.data)
        }
      })
    }
  })
}
// 单文件哈希
export function hashFile(
  file,
  chunkSize,
  parallel = false, // 是否开启并行读取文件
  maxParallelWorkerNum = 2 // 并行读取文件的worker的最大数量
) {
  return new Promise(resolve => {
    const worker = new Worker(
      parallel ? './parallel-worker.js' : './serial-worker.js'
    )
    worker.postMessage({ file, chunkSize, maxWorkerNum: maxParallelWorkerNum })
    worker.onmessage = e => {
      resolve(e.data)
      worker.terminate()
    }
  })
}
function createWorkerPool() {
  class WorkerPool {
    constructor() {
      this.workers = []
    }
    push(worker) {
      this.workers.push(worker)
    }
    get() {
      if (this.workers.length) return this.workers.pop()
    }
    destroy() {
      this.workers.forEach(worker => {
        worker.terminate()
      })
      this.workers = []
    }
  }
  return new WorkerPool()
}
function createScheduler(globalMaxHashWorkerNum) {
  class Scheduler {
    constructor(max = 6) {
      this.max = max
      this.count = 0
      this.tasks = []
      this.callbacks = []
    }
    queue(task) {
      this.tasks.push(task)
      this.start()
    }
    start() {
      while (this.isAvailable) {
        this.run(this.tasks.shift())
        this.count++
      }
      if (this.isEnd) {
        this.notify()
      }
    }
    async run(task) {
      try {
        await task()
      } finally {
        this.count--
      }
      this.start()
    }
    notify() {
      while (this.callbacks.length) {
        const cb = this.callbacks.shift()
        cb()
      }
    }
    set onend(cb) {
      if (typeof cb === 'function') {
        this.callbacks.push(cb)
      }
    }
    get isEnd() {
      return this.isEmpty && !this.isRunning
    }
    get isAvailable() {
      return !this.isEmpty && this.isFree
    }
    get isEmpty() {
      return this.tasks.length === 0
    }
    get isRunning() {
      return this.count > 0
    }
    get isFree() {
      return this.count < this.max
    }
  }
  return new Scheduler(globalMaxHashWorkerNum || 8)
}

// 计算并格式化文件大小
export function getFileSize(size) {
  if (!size) return { size: '0', unit: 'B' }
  const unitList = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const maxUnitIndex = unitList.length - 1
  const floatSize = parseFloat(size)
  const unitIndex = Math.min(
    Math.floor(Math.log(floatSize) / Math.log(1024)),
    maxUnitIndex
  )
  return {
    size: (floatSize / Math.pow(1024, unitIndex)).toFixed(2),
    unit: unitList[unitIndex],
  }
}
// 获取文件元信息：大小、名称、扩展名
export function fileMetaData(file) {
  const sizes = getFileSize(file.size)
  const extension = file.name
    .slice(file.name.lastIndexOf('.') + 1)
    .toUpperCase()
  const name = file.name.slice(0, file.name.lastIndexOf('.')) || extension
  return { sizes, name, extension, fileSize: sizes.size + sizes.unit }
}
// 获取点击上传的文件的路径
export function filePath(file) {
  let path = file.webkitRelativePath
  if (path) {
    const firstSlashIndex = path.indexOf('/')
    const lastSlashIndex = path.lastIndexOf('/')
    path =
      firstSlashIndex !== lastSlashIndex
        ? path.slice(firstSlashIndex + 1, lastSlashIndex)
        : ''
  } else {
    path = ''
  }
  return path
}
// 获取拖放的文件的路径
export function filePathInDropFile(file) {
  let path
  if (file.path) {
    const temp = file.path.substring(1)
    const slashIndex = temp.indexOf('/')
    path = slashIndex > -1 ? temp.slice(slashIndex + 1) : ''
  } else {
    path = ''
  }
  return path
}
// 获取拖拽放置的文件
export function getDropFiles(items) {
  return new Promise(resolve => {
    const files = []
    const obj = new Proxy(
      { count: 0, timer: null },
      {
        set(target, key, value) {
          if (key === 'count') {
            clearTimeout(target.timer)
            target.timer = setTimeout(() => {
              resolve(
                files.map(item => ({ ...item, path: filePathInDropFile(item) }))
              )
            }, 100)
          }
          target[key] = value
          return true
        },
      }
    )
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry()
      if (item) {
        scanFiles(item)
      }
    }
    function readEntires(directoryReader, path, item) {
      directoryReader.readEntries(entries => {
        entries.forEach(entry => {
          scanFiles(entry, path + '/' + item.name)
        })
        // readEntries每一次只能读取100个文件，大于100个文件时，需要递归读取
        if (entries.length > 0) {
          readEntires(directoryReader, path, item)
        }
      })
    }
    function scanFiles(item, path = '') {
      if (item.isDirectory) {
        const directoryReader = item.createReader()
        readEntires(directoryReader, path, item)
      } else {
        obj.count++
        item.file(file => {
          files.push({ file, path })
          obj.count--
        })
      }
    }
  })
}
// 计算生成文件预览图的url
export function getFilePreviewUrl(workerFile) {
  if (!isImage(workerFile.extension)) {
    if (isOffice(workerFile.extension)) {
      const docUrl = require('@/assets/img/doc.svg')
      const xlsxUrl = require('@/assets/img/xlsx.svg')
      const pptUrl = require('@/assets/img/ppt.svg')
      const pdfUrl = require('@/assets/img/pdf.svg')
      const zipUrl = require('@/assets/img/zip.svg')
      const officeUrls = {
        DOC: docUrl,
        DOCX: docUrl,
        XLS: xlsxUrl,
        XLSX: xlsxUrl,
        PPT: pptUrl,
        PPTX: pptUrl,
        PDF: pdfUrl,
        TAR: zipUrl,
        ZIP: zipUrl,
        RAR: zipUrl,
        '7Z': zipUrl,
      }
      return officeUrls[workerFile.extension]
    }
    const errorUrl = require('@/assets/img/error.png')
    return errorUrl
  }
  return URL.createObjectURL(workerFile.file)
}
// 是否为图片格式
function isImage(extension) {
  const imageTypes = 'bmp,jpg,jpeg,png,tif,gif,ico,pcx,tga,exif,fpx,svg,psd,cdr,pcd,dxf,ufo,eps,ai,raw,wmf,webp,avif'
    .toUpperCase()
    .split(',')
  return imageTypes.includes(extension)
}
// 是否为办公文件
function isOffice(extension) {
  const officeTypes = 'tar,zip,7z,rar,pdf,doc,docx,xls,xlsx,ppt,pptx'
    .toUpperCase()
    .split(',')
  return officeTypes.includes(extension)
}
