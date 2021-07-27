import Vue from 'vue'
import VueRouter from 'vue-router'
import router from './routers'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

Vue.use(VueRouter)

NProgress.configure({ showSpinner: false })

router.beforeEach((to, from, next) => {
  // 进度条
  NProgress.start()
  // 设置皮肤
  window.document.documentElement.setAttribute('data-theme', '_blue')
  next()
})

router.afterEach(() => {
  NProgress.done()
})
