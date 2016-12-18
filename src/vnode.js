import Node from './node'

export default class Vnode extends Node {
  attributes = []
  eventListeners = []
  constructor (tagName = 'div') {
    super(...arguments)
    this.tagName = tagName.toLowerCase()
  }
  addAttribute (attr) {
    attr.parentNode = this
    this.attributes.push(attr)
  }
  addEventListener (listener) {
    listener.parentNode = this
    this.eventListeners.push(listener)
  }
  clone () {
    const cloned = super.clone()
    for (const attr of this.attributes) {
      cloned.addAttribute(attr.clone())
    }
    for (const listener of this.eventListeners) {
      cloned.addEventListener(listener.clone())
    }
    return cloned
  }
}
