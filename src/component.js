import Node from './node'
import Patcher from './patcher'

// TODO test cloning
export default class Component extends Node {
  /**
   * A Component is a node, which is responsible for managing Vnodes
   * and Components
   */
  attributes = []
  scope = {}
  patcher = null
  constructor (tagName = 'div') {
    super(...arguments)
    this.tagName = tagName.toLowerCase()
  }
  recycle (node) {
    if (!node.parentNode) return
    node.parentNode.removeChild(node)
  }
  mount (el) {
    this._mounted = el
    this.patcher = new Patcher(this._mounted, this)
  }
  patch () {
    this.patcher.reset()
    while (this.patcher.patch() && this.patcher.next());
  }
}

