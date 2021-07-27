<template>
  <div>
    <span @click="visible = true">
      <slot></slot>
    </span>
    <el-dialog
      v-loading="readingFiles"
      class="upload-dialog"
      top="0px"
      :visible="visible"
      :append-to-body="true"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :element-loading-text="loadingText || '正在读取上传文件...'"
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.55)"
      @close="handleClose"
    >
      <div class="container">
        <div class="head-section">
          <div class="title">
            <span class="label">上传测试</span>
          </div>
          <div class="bars">
            <i @click="handleClose" class="close-button el-icon-close"></i>
          </div>
        </div>
        <div class="upload-section">
          <div class="body-section">
            <div class="left-box">
              <div class="images-container">
                <Upload
                  :draggable="true"
                  ref="uploader"
                  @loading="v => (loadingText = v)"
                  @init-urls="v => (urls = { ...urls, ...v })"
                  @update-hash="updateHash"
                  @update-files="updateFiles"
                  @reading-files="r => (readingFiles = r)"
                >
                  <div v-show="showImages" class="image-list-box">
                    <VirtualList :data="renderList" :running="visible">
                      <template v-slot="img">
                        <div
                          v-if="img.uid === 'button'"
                          @click="addFiles('files')"
                          class="image-add-button"
                        >
                          <i class="icon el-icon-plus"></i>
                          <span class="label">添加文件</span>
                        </div>
                        <div v-else class="image-box wrapper" :key="img.uid">
                          <lazy-component
                            class="image-wrapper"
                            :key="urls[img.uid] ? 'show' : 'hide'"
                          >
                            <img
                              class="image"
                              :src="urls[img.uid] || loadingUrl"
                              @load="loadImage(img)"
                              :alt="img.name"
                            />
                          </lazy-component>
                          <div class="flags-box">
                            <span class="flag">{{ img.extension }}</span>
                          </div>
                          <div class="action-box">
                            <i
                              @click="removeFile(img)"
                              class="icon el-icon-delete"
                            ></i>
                          </div>
                          <div class="image-name">
                            <span class="name">{{ img.name }}</span>
                            <div class="image-meta" :title="img.fileSize">
                              <span>{{ hashes[img.uid] || img.fileSize }}</span>
                            </div>
                          </div>
                        </div>
                      </template>
                    </VirtualList>
                  </div>
                  <div v-show="!showImages && !readingFiles" class="upload-box">
                    <div class="icon-box">
                      <i
                        class="icon iconfont iconwenjianshangchuan"
                        @click="addFiles('files')"
                      ></i>
                      <i
                        class="icon iconfont iconwenjianjiashangchuan1"
                        @click="addFiles('folders')"
                      ></i>
                    </div>
                    <div class="upload-text">
                      <span>将</span>
                      <a class="inline-button" @click="addFiles('files')"
                        >文件</a
                      >
                      <span> / </span>
                      <a class="inline-button" @click="addFiles('folders')">
                        文件夹
                      </a>
                      <span>拖到此处，或点击图标上传</span>
                    </div>
                  </div>
                </Upload>
              </div>
            </div>
          </div>
          <div class="foot-section">
            <span class="upload-desc"> {{ description }}</span>
            <div class="upload-button-box">
              <el-button @click="addFiles('files')" class="button" size="mini">
                添加文件
              </el-button>
              <el-button
                @click="startHash('serial')"
                size="mini"
                type="primary"
                :loading="hashing"
              >
                {{ hashing ? '计算中...' : '串行计算哈希' }}
              </el-button>
              <el-button
                @click="startHash('parallel')"
                size="mini"
                type="primary"
                :loading="hashing"
              >
                {{ hashing ? '计算中...' : '并行计算哈希' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import Upload from './Upload'
import VirtualList from './VirtualList'
import { getFilePreviewUrl, getFileSize } from '@/utils'

export default {
  components: {
    Upload,
    VirtualList,
  },
  data() {
    return {
      visible: false,
      readingFiles: false,
      images: [],
      loadingUrl: require('@/assets/img/loading.gif'),
      loadingText: '',
      statusMap: {},
      timing: 0,
      hashing: false,
      hashes: {}, // 文件哈希对象
      urls: {}, // 文件预览url对象
      chunkSize: 25 * 1024 * 1024, // 上传分片的大小
    }
  },
  computed: {
    renderList() {
      return [...this.images, { uid: 'button' }]
    },
    showImages() {
      return this.images.length > 0
    },
    totalSize() {
      return this.images.reduce((prev, next) => prev + next.file.size, 0)
    },
    description() {
      const totalCount = this.images.length
      const fileSize = getFileSize(this.totalSize)
      const totalSize = fileSize.size + fileSize.unit
      const sizeText = `${totalCount}个文件${
        totalCount ? '，' + totalSize : ''
      }`
      const timingText = this.timing ? `，哈希计算耗时${this.timing}ms` : ''
      return sizeText + timingText
    },
  },
  mounted() {
    window.onbeforeunload = e => {
      e = e || window.event
      // 兼容IE8和Firefox 4之前的版本
      if (e && this.uploading) {
        e.returnValue = '文件正在上传中，确认离开？'
      }
      // Chrome, Safari, Firefox 4+, Opera 12+ , IE 9+
      if (this.uploading) {
        return '文件正在上传中，确认离开？'
      }
    }
  },
  beforeDestroy() {
    this.clearBlobUrls()
  },
  methods: {
    async startHash(type) {
      console.time('哈希计算消耗时间:')
      this.hashing = true
      this.timing = 0
      let timing = Date.now()
      const hashes = await this.$refs.uploader.hashFiles(
        this.images,
        type === 'parallel'
      )
      this.timing = Date.now() - timing
      this.hashing = false
      console.timeEnd('哈希计算消耗时间:')
      this.hashes = hashes
    },
    handleClose() {
      this.visible = false
    },
    addFiles(type) {
      this.$refs.uploader.addFiles(type)
    },
    removeFile(image) {
      const index = this.images.findIndex(item => item.uid === image.uid)
      if (index > -1) {
        this.images.splice(index, 1)
      }
    },
    updateFiles(files) {
      const images = this.images
      files.forEach(file => {
        images.push(file)
      })
    },
    updateUrl(file, url) {
      this.$set(this.urls, file.uid, url)
    },
    updateHash(file, hash) {
      this.$set(this.hashes, file.uid, hash)
    },
    loadImage(image) {
      const blobUrl = this.urls[image.uid]
      if (!blobUrl) {
        const task = () => {
          const url = getFilePreviewUrl(image)
          this.updateUrl(image, url)
        }
        // 缩略图的生成不应该阻碍用户操作，所以放到idle阶段处理
        window.requestIdleCallback(task)
      }
    },
    clearBlobUrls() {
      // 清除blob url的引用，以免内存泄漏
      Object.values(this.urls).forEach(url => {
        URL.revokeObjectURL(url)
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.upload-dialog
  >>> .el-dialog
    width calc(100% - 32px)
    height calc(100% - 120px)
    max-height: 1000px;
    max-width: 1324px;
    top: 50%;
    transform: translateY(-50%);
    bg_color(modal-bg-color)
  >>> .el-dialog__header
    display none
  >>> .el-dialog__body
    height 100%
    padding 0px 0 0px
    font_color(font-main-color)
  >>> .el-loading-spinner i
    color #fff
    font-size 36px
  >>> .el-loading-spinner .el-loading-text
    color #fff
.container
  display flex
  height 100%
  flex-flow column
  .head-section
    height 46px
    display flex
    align-items center
    padding 0 12px
    .title
      flex 1
      display flex
      align-items center
      padding-right 28%
      .label
        flex-shrink 0
        margin-right 8px
    .bars
      display flex
      align-items center
    .close-button
      font-size 20px
      cursor pointer
      &:hover
        font_color(font-main-color)
  .upload-section
    height calc(100% - 46px)
  .body-section
    display flex
    height calc(100% - 56px)
    border-bottom 1px solid transparent
    border-top 1px solid transparent
    border_color(main-color)
    padding-left 16px
  .foot-section
    height 56px
    display flex
    justify-content flex-end
    align-items center
    padding 0 12px
    .upload-desc
      padding-left 16px
      font-size 12px
    .upload-button-box
      display flex
    .button
      margin-left 12px
  .left-box
    display flex
    flex-flow column
    height 100%
    width 100%
    overflow auto
    padding 16px 8px 16px 16px
    border-right 1px solid transparent
    border_color(main-color)
    .images-container
      flex 1
      height 100%
      .upload-box
        display flex
        align-items center
        justify-content center
        flex-flow column
        width 100%
        .icon-box
          margin-bottom 16px
          .icon
            font-size 48px
            cursor pointer
            font_color(font-main-color)
            &:hover
              font_color(font-active-color)
          .icon+.icon
            margin-left 16px
        .inline-button
          cursor pointer
          display inline-block
          border-radius 4px
          padding 0 0px
          margin 0 2px
          &:hover
            bg_color(font-active-color)
      .image-list-box
        display flex
        flex-wrap wrap
        justify-content flex-start
        align-self flex-start
        width 100%
        height 100%
        .image-add-button.hidden
          visibility hidden
        .image-add-button
          display flex
          flex-flow column
          align-items center
          justify-content center
          margin 0 16px 16px 0
          width 146px
          height 120px
          padding 2px
          border 1px dashed transparent
          font_color(font-minor-color)
          bg_color(minor-color)
          border_color(main-color)
          cursor pointer
          &:hover
            font_color(font-main-color)
            .icon
              font_color(font-main-color)
          .icon
            font-size 48px
            padding-bottom 8px
          .label
            font-size 14px
        .image-box.wrapper
          .image-wrapper
            width calc(100% - 6px)
            height calc(100% - 50px)
            .image
              width 100%
              height 100%
        .image-box
          position relative
          display flex
          flex-flow column
          align-items center
          justify-content flex-end
          margin 0 16px 16px 0
          width 146px
          height 120px
          padding 2px
          border 1px solid transparent
          border_color(main-color)
          bg_color(minor-color)
          &:hover
            .action-box
              visibility visible
          .flags-box
            position absolute
            height 17px
            width 100%
            top 8px
            left -4px
            display flex
            align-items center
            justify-content flex-start
            .flag
              display inline-block
              padding 2px 8px
              font-size 12px
              border-top-right-radius 4px
              border-bottom-right-radius 8px
              overflow hidden
              white-space nowrap
              text-overflow ellipsis
              font_color(font-white-color)
              bg_color(font-active-color)
          .action-box
            position absolute
            visibility hidden
            bg_color(font-black-opacity-color)
            bottom 48px
            height 24px
            width 100%
            display flex
            align-items center
            justify-content flex-end
            .icon
              margin 0 8px
              cursor pointer
          .image
            width calc(100% - 6px)
            height calc(100% - 50px)
            object-fit contain
          .image-name
            text-align center
            width 100%
            height 46px
            .image-meta
              font-size 12px
              height 20px
              line-height 20px
              text-overflow ellipsis
              white-space nowrap
              overflow hidden
              width 100%
              >span:first-child
                padding-right 8px
            .name
              line-height 17px
              display inline-block
              padding 4px 0 2px
              text-overflow ellipsis
              white-space nowrap
              overflow hidden
              width 100%
</style>
