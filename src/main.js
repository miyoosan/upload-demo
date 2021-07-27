import Vue from 'vue'
import App from './App.vue'
import router from './router/routers'
import './router/index'
import 'normalize.css/normalize.css'
import 'element-ui/lib/theme-chalk/index.css'
import ElementUI from 'element-ui'
import VueLazyload from 'vue-lazyload'

Vue.config.productionTip = false

Vue.use(ElementUI)
Vue.use(VueLazyload, {
  observer: true,
  lazyComponent: true,
  preLoad: 1.3,
  error: require('./assets/img/error.png'),
  loading: require('./assets/img/loading.gif'),
  attempt: 1,
})

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')
