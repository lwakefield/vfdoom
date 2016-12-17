import Node from './node'

export default class Vnode extends Node {
  attributes = []
  eventListeners = []
  constructor (tagName = 'div') {
    super(...arguments)
    this.tagName = tagName
  }
  addAttribute (attr) {
    attr.parentNode = this
    this.attributes.push(attr)
  }
  clone () {
    const cloned = super.clone()
    for (const attr of this.attributes) {
      cloned.addAttribute(attr.clone())
    }
    return cloned
  }
}
