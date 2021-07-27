import Vue from 'vue'
import Router from 'vue-router'
import routerMap from './routerMap'

Vue.use(Router)

const routes = [
  {
    path: '/',
    component: routerMap.TestUpload,
  },
]

export default new Router({
  scrollBehavior: () => ({
    y: 0,
  }),
  routes,
})
