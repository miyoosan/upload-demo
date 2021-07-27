<template>
  <div
    class="vue3-virtual-list-container"
    ref="root"
    @scroll.passive="handleScroll"
  >
    <div
      class="vue3-virtual-list-scroll"
      :style="`height: ${scrollHeight}px;padding-top: ${paddingTop}px`"
    >
      <div
        class="vue3-virtual-list-item-container"
        v-for="item in renderList"
        :key="item[dataKey]"
        :style="`height: ${itemHeight}px`"
      >
        <slot v-bind="item"></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    data: {
      type: Array,
      default: () => [],
    },
    dataKey: {
      type: String,
      default: () => 'uid',
    },
    itemHeight: {
      type: Number,
      default: () => 136,
    },
    itemWidth: {
      type: Number,
      default: () => 162,
    },
    bufferRowNum: {
      type: Number,
      default: () => 10,
    },
    running: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      renderList: [],
      scrollHeight: this.data.length * this.itemHeight,
      root: null,
      paddingTop: 0,
      isScrollBusy: false,
    }
  },
  watch: {
    data: {
      immediate: true,
      deep: true,
      handler(val) {
        // 组件在不可见期间，不需要对变化做处理
        if (!this.running) return
        if (!this.root) return
        this.renderOnDataChange(val)
      },
    },
    running(val) {
      // 组件在不可见期间，数据可能有变化，那么它重新变得可见的时候，需要重新渲染一下，保证UI正确
      if (val) {
        this.renderOnDataChange(this.data)
      }
    },
  },
  mounted() {
    this.root = this.$refs.root
  },
  methods: {
    handleScroll() {
      if (!this.root) return
      if (this.isScrollBusy) return
      this.isScrollBusy = true
      requestAnimationFrame(() => {
        this.isScrollBusy = false
        if (!this.root) return
        this.renderOnScrolling(this.data)
      })
    },
    renderOnScrolling(data) {
      const { itemHeight, toTopRowNum } = this.updateRenderList(data)
      this.paddingTop = toTopRowNum * itemHeight
    },
    renderOnDataChange(data) {
      const { itemHeight, totalRowNum } = this.updateRenderList(data)
      this.scrollHeight = itemHeight * totalRowNum
    },
    updateRenderList(data) {
      const fileNum = data.length
      const itemWidth = this.itemWidth
      const itemHeight = this.itemHeight
      const bufferRowNum = this.bufferRowNum
      const containerWidth = this.root.clientWidth
      const containerHeight = this.root.clientHeight
      const containerScrollTop = this.root.scrollTop
      const containerScrollRowNum = Math.floor(containerScrollTop / itemHeight)
      const containerPaddingRight = 8
      const fileNumPerRow = Math.ceil(
        (containerWidth - containerPaddingRight) / itemWidth
      )
      const viewportRowNum = Math.ceil(containerHeight / itemHeight)
      const renderRowNum = viewportRowNum + bufferRowNum
      const renderItemNum = renderRowNum * fileNumPerRow
      const halfBufferRowNum = Math.floor(bufferRowNum / 2)
      const toTopRowNum = Math.max(containerScrollRowNum - halfBufferRowNum, 0)
      const toTopHiddenItemNum = toTopRowNum * fileNumPerRow

      const totalRowNum = Math.floor(fileNum / fileNumPerRow)
      const renderStartNum = Math.max(toTopHiddenItemNum, 0)
      const renderEndNum = renderStartNum + renderItemNum
      this.renderList = data.slice(renderStartNum, renderEndNum)
      return {
        itemHeight,
        toTopRowNum,
        totalRowNum,
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.vue3-virtual-list-container {
  width: 100%;
  height: 100%;
  min-width: 100px;
  min-height: 100px;
  overflow: auto;
}
.vue3-virtual-list-scroll {
  box-sizing: border-box;
}
.vue3-virtual-list-item-container {
  overflow: hidden;
  display inline-block
}
</style>
