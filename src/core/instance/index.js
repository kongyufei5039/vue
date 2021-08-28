import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// Vue 构造函数
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // ***** 初始化开始 *****
  this._init(options)
}

// 给 Vue 的原型对象增加 _init 方法
initMixin(Vue)
// 给 Vue 的原型对象上初始化一些响应式属性
stateMixin(Vue)
// 给 Vue 的原型对象上增加 $on 方法，用来监听自定义事件，可以通过 $emit 触发
eventsMixin(Vue)
// 给 Vue 的原型对象上增加 _update、$forceUpdate、$destroy 方法
lifecycleMixin(Vue)
// 给 Vue 的原型对象上增加 $nextTick、_render 方法
renderMixin(Vue)

export default Vue
