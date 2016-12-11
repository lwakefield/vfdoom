/* eslint-env browser */
// import Tnode from './tnode'

export function objGet (obj, path) {
  const keys = path.split('.')
  return keys.reduce((curr, key) => {
    return curr != null && key in curr ? curr[key] : null
  }, obj)
}

/**
 * observe recursively mutates an Object and makes it reactive
 * If a property is set on an Object (that is known), fn will be called
 * If a property is set to an Object, we will observe that as well
 *
 * We can't observe things we don't know about.
 * obj = {foo: 1}
 * observe(obj, alert.bind('a change has been made!'))
 * // This will not be observed...
 * obj.bar = 2
 */
export function observe (obj, fn) {
  let p = new Proxy(obj, {
    set (target, property, val) {
      target[property] = val instanceof Object
        ? observe(val, fn)
        : val
      // Do the notification!
      if (fn) fn()
      return true
    },
  })

  // When doing the initial observation, we wish to observe all properties which
  // are objects as well
  for (let key of Object.keys(obj)) {
    if (obj[key] instanceof Object) {
      obj[key] = observe(obj[key], fn)
    }
  }

  return p
}

// export function nodeTypeMismatch (a, b) {
//   // TODO: double check these cases, should they be true!?
//   if (!a || !b) return false
//   if (a instanceof Text && !(b instanceof Tnode)) return true
//   if (!a.tagName || !b.tagName) return false
//   return a.tagName.toLowerCase() !== b.tagName.toLowerCase()
// }
