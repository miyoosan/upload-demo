<template>
  <div class="test-container">
    <div class="title">上传demo：测试超大文件哈希计算</div>
    <UploadModal>
      <el-button type="primary">打开上传弹框</el-button>
    </UploadModal>
  </div>
</template>

<script>
import UploadModal from '@/components/UploadModal'
export default {
  components: {
    UploadModal,
  },
}
</script>

<style lang="stylus" scoped>
.test-container
  padding 200px
  display flex
  flex-flow column
  justify-content center
  align-items center
.title
  font-size 24px
  margin 16px
</style>
