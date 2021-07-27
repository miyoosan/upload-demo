<template>
  <transition
    id="app"
    mode="out-in"
    enter-active-class="fadeIn"
    leave-active-class="fadeOut"
    appear
  >
    <router-view></router-view>
  </transition>
</template>

<style lang="stylus">
html
  background transparent
  font-size 14px
  -moz-osx-font-smoothing grayscale
  -webkit-font-smoothing antialiased
  text-rendering optimizeLegibility
  box-sizing border-box
a
  text-decoration none
html, body
  height 100%
  margin 0
  padding 0
  overflow hidden
  font-family -apple-system, BlinkMacSystemFont, segoe ui, Roboto, helvetica neue, Arial, noto sans, sans-serif, apple color emoji, segoe ui emoji, segoe ui symbol, noto color emoji, cursive
  bg_color(main-bg-color)
  font_color(font-white-color)
  *
    box-sizing border-box
  ul, li, p
    margin 0
    list-style none
  div
    &::-webkit-scrollbar
      width 8px
      height 8px
    &::-webkit-scrollbar-thumb
      background transparent
      border-radius 0px
      transition background 0.5s
    &::-webkit-scrollbar-corner
      background transparent
    &::-webkit-scrollbar-track
      background transparent
      border-radius 0
    scrollbar-width thin
    scrollbar-color dark
    scrollbar-track-color transparent
    -ms-scrollbar-track-color transparent
    &:hover
      &::-webkit-scrollbar-thumb
        bg_color(scroll-bar-bg-color)
</style>
