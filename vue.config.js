const path = require('path')
const isProduction = process.env.NODE_ENV === 'production'
const CompressionWebpackPlugin = require('compression-webpack-plugin')

// 查看更详细的警告堆栈
// process.on('warning', (e) => {
//   console.log(e);
// })

module.exports = {
  publicPath: '/',
  outputDir: 'dist', // 程序输出路径
  assetsDir: 'assets', // 资源打包路径
  indexPath: 'index.html', // HTML 输出路径
  filenameHashing: true, // 文件名哈希
  lintOnSave: true, // 保存的时候使用es进行检查
  devServer: {
    public: 'localhost:8080', // 本地ip
  },
  chainWebpack: config => {
    config.resolve.alias.set('@', path.join(__dirname, 'src'))
  },
  configureWebpack: config => {
    if (!isProduction) return
    config.plugins.push(
      new CompressionWebpackPlugin({
        // 正在匹配需要压缩的文件后缀
        test: /\.(js|css|svg|woff|ttf|json|html)$/,
        // 大于10kb的会压缩
        threshold: 10240,
        // 其余配置查看compression-webpack-plugin
      })
    )
  },
  // 打包不生成.map文件
  productionSourceMap: false,
  css: {
    extract: isProduction, // 将组件内的css 提取到单独的css文件
    sourceMap: false, // 是否开启 .map
    loaderOptions: {
      // 全局注入通用样式
      css: {
        modules: {
          localIdentName: '[name]-[hash]',
        },
        localsConvention: 'camelCaseOnly',
      },
      stylus: {
        import: path.resolve(__dirname, './src/assets/stylus/mixin.styl'),
      },
    },
    requireModuleExtension: true, // 为所有css及其处理文件开启css modules
  },
}
