/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // 一些全局配置，可参考官方文档 https://cn.vuejs.org/v2/api/#%E5%85%A8%E5%B1%80%E9%85%8D%E7%BD%AE
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  // 3个很有用的全局函数
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // Vue 响应式处理的核心函数
  // 2.6 explicit observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  // 初始化 options，主要用于存放 Vue 实例的一些对象和方法
  Vue.options = Object.create(null)

  // 定义全局 component、directive、filter
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue

  extend(Vue.options.components, builtInComponents)

  // 初始化 Vue.use 方法，主要是用来应用插件
  initUse(Vue)
  // 初始化 Vue.mixin 方法，主要用来混入 options
  initMixin(Vue)
  // 初始化 Vue.extend 方法
  initExtend(Vue)
  // 初始化 Vue.component、Vue.directive、Vue.filter
  initAssetRegisters(Vue)
}
