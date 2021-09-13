/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer 类被用来创建 observed 对象，
 * 一但创建成功，普通对象的 property 的 getter/setter 就会被修改，
 * 用来做依赖收集和分发更新。
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    // 给 val 对象定义 __ob__ 属性值为观察者对象，主要作用是已经转变为观察者对象就不再进行转换，直接从 __ob__ 上取
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      // 保留数组原型上的方法
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 如果是数组，遍历数组的每一项进行观察
      this.observeArray(value)
    } else {
      // 进行观察
      this.walk(value)
    }
  }

  /**
   * 遍历目标对象上的所有 property，修改每个 property 的 getter/setter。
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      // 观察者对象的本质是将对每个属性变为响应式的
      defineReactive(obj, keys[i])
    }
  }

  /**
   * 将数组的每一项进行观察
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * 尝试为一个值创建一个 observer 实例，
 * 如果被观察成功返回一个新的 observer 实例，
 * 或者如果这个值已经被观察，则返回已存在的 observer 对象。
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果不是一个对象类型或者是 VNode 实例，返回
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // 如果已经被观察，用已存在的 observer 对象
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 如果可转变为 observer 对象、不是服务端渲染、是一个数组或简单对象、是一个可扩展对象，
    // 不是一个 Vue 实例对象（src/core/instance/init.js 33），则转变为 observer 对象
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * 在一个对象上定义一个 reactive property。
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  /**
   * 初始化一个 Dep 实例
   * 这里用一个闭包保存 dep，
   * dep 跟 observer 对象是一一对应关系
   */
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 当 property 的 configurable 为 false 的时候，不能改变 property 为响应式
  if (property && property.configurable === false) {
    return
  }

  // 获取 getter/setter
  // 给 property 预定义 getter/setters
  const getter = property && property.get
  const setter = property && property.set
  // 如果 getter/setter 其中有且仅有一个，并且参数只有 obj、key 时，给 val 赋值
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 如果 obj 的 值 val 是一个嵌套对象，则也转变为观察者对象
  // 这里其实是递归转变为观察者对象
  let childOb = !shallow && observe(val)

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 代理 getter，也就是 obj 的属性 key 被访问的时候
      const value = getter ? getter.call(obj) : val
      /**
       * Dep.target 实际上是一个 watcher
       * watcher 实例化在 src/core/instance/lifecycle.js 的 mountComponent 方法中
       * 这意味着第一次依赖收集的时机在 $mount 时，
       * 而触发 getter 是在 Watcher 的构造函数中
       */
      if (Dep.target) {
        // 依赖收集，其实是给 subs 添加对应的 watcher
        dep.depend()
        if (childOb) {
          // 如果 obj 的 val 也是转变为观察者对象，则做依赖收集
          childOb.dep.depend()
          if (Array.isArray(value)) {
            // 如果 value 是数组，则给每项做依赖收集
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      // 代理 setter，也就是 obj 的 key 属性值被修改的时候
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 如果新值是对象，则转变为观察者对象
      childOb = !shallow && observe(newVal)
      // 通知订阅者，触发更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
