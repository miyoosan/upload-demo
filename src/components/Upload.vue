<template>
  <div
    v-if="draggable"
    class="drop-box"
    :class="{ dragover: isDragover, draggable }"
    @dragleave.stop="dragleave"
    @dragover.stop.prevent="dragover"
    @drop.stop.prevent="drop"
  >
    <slot></slot>
  </div>
  <div class="drop-box" v-else>
    <slot></slot>
  </div>
</template>

<script>
import {
  hashFiles,
  filePath,
  fileMetaData,
  getDropFiles,
  getFilePreviewUrl,
} from '@/utils'
import { v4 as uuidv4 } from 'uuid'
export default {
  props: {
    draggable: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      files: [],
      isDragging: false,
      isDragover: false,
      timer: null,
    }
  },
  methods: {
    async hashFiles(fileList, parallel) {
      if (!fileList.length) return {}
      const files = await hashFiles({
        files: fileList,
        onhash: (hash, file) => {
          this.$emit('update-hash', file, hash)
        },
        parallel,
      })
      const hashes = files.reduce(
        (prev, next) => ({ ...prev, [next.uid]: next.hash }),
        {}
      )
      return hashes
    },
    async processFiles(fileList) {
      this.$emit('loading', '正在生成文件预览图...')
      const urls = {}
      const lastIndex = this.files.length
      fileList.forEach((file, i) => {
        file = Object.assign(file, fileMetaData(file.file))
        file.uid = uuidv4()
        file.index = lastIndex + i // 保证后面添加的文件也有正确索引
        // 出于性能考虑与实际意义，只生成前一百张预览图片，后面的滚动到查看位置再自动生成
        if (i < 100) {
          urls[file.uid] = getFilePreviewUrl(file)
        }
      })
      this.files = [...this.files, ...fileList]
      this.$emit('init-urls', urls)
      this.$emit('loading', '准备渲染预览文件...')
      this.$emit('reading-files', false)
      this.$emit('update-files', fileList)
    },
    addFiles(type) {
      if (type === 'files') {
        this.addFile()
      } else {
        this.addFolder()
      }
    },
    addFile() {
      const input = document.createElement('input')
      input.setAttribute('type', 'file')
      input.setAttribute('multiple', 'true')
      input.onchange = this.getInputFiles
      input.click()
    },
    addFolder() {
      const input = document.createElement('input')
      input.setAttribute('type', 'file')
      input.setAttribute('multiple', 'true')
      input.setAttribute('webkitdirectory', 'true')
      input.onchange = this.getInputFiles
      input.click()
    },
    getInputFiles(e) {
      this.$emit('reading-files', true)
      const files = [...e.target.files].map(item => ({
        file: item,
        path: filePath(item),
      }))
      this.processFiles(files)
    },
    async drop(e) {
      if (!this.isDragover) return
      this.$emit('reading-files', true)
      this.isDragover = false
      e.dataTransfer.dropEffect = 'move'
      const files = await getDropFiles(e.dataTransfer.items)
      this.processFiles(files)
    },
    dragover(e) {
      if (e.dataTransfer.items[0]?.kind === 'file') {
        this.isDragover = true
        this.isDragging = true
      }
    },
    dragleave() {
      clearTimeout(this.timer)
      this.isDragging = false
      // 延迟触发离开状态，如果确实已经离开，则重置背景
      this.timer = setTimeout(() => {
        if (!this.isDragging) {
          this.isDragover = false
        }
      }, 10)
    },
  },
}
</script>

<style lang="stylus" scoped>
.drop-box.draggable
  width 100%
  height 100%
  border 1px dashed transparent
.drop-box
  display flex
  position relative
.drop-box.draggable.dragover
  bg_color(main-bg-color)
</style>
