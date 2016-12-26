import {Tnode, Component} from './nodes'
import {
  nodeTypeMismatch, isTNode, isComponent, isFunctionalNode,
} from './util'
export default class Patcher {
  /**
   * Both next() and patch() are integral to the patching process. next() is
   * responsible for creating/removing/reordering nodes in the tree. patch() is
   * responsible for adding attributes and event listeners.
   */
  constructor (node, component) {
    this.component = component
    this.startNodeA = node
    this.startNodeB = component
    this.nodeA = node
    this.nodeB = component
  }
  reset () {
    this.nodeA = this.startNodeA
    this.nodeB = this.startNodeB
  }
  patch () {
    let {nodeA, nodeB, component} = this

    let mounted = nodeB.mounted
    if (mounted && nodeA !== mounted) {
      component.recycle(nodeA)
      nodeA = mounted
    } else if (!mounted) {
      nodeB.mounted = nodeA
      mounted = nodeA
    }

    if (isTNode(nodeB)) {
      mounted.textContent = nodeB.text
      return true
    } else if (isComponent(nodeB) && nodeB !== this.component) {
      if (!nodeB.el) nodeB.mount(nodeA)
      nodeB.patch()
      return true
    }

    this._patchAttrs(mounted, nodeB)
    this._patchEventListeners(mounted, nodeB)
    return true
  }
  static getAttrsFromDnode (dnode) {
    return Array.from(dnode.attributes)
  }
  _patchAttrs (dnode, vnode) {
    const dnodeAttrs = {}
    for (const attr of Patcher.getAttrsFromDnode(dnode)) {
      dnodeAttrs[attr.name] = attr.value
    }

    const vnodeAttrs = vnode.attributes || []
    for (const attr of vnodeAttrs) {
      if (attr.value !== dnodeAttrs[attr.name]) {
        dnode.setAttribute(attr.name, attr.value)
      }
      delete dnodeAttrs[attr.name]
    }

    for (const key of Object.keys(dnodeAttrs)) {
      dnode.removeAttribute(key)
    }
  }
  _patchEventListeners (dnode, vnode) {
    if (!vnode.eventListeners) return

    for (const listener of vnode.eventListeners) {
      if (!listener.attachedTo) {
        listener.attachTo(dnode)
      } else if (listener.attachedTo !== dnode) {
        // TODO: should this case ever occur?
        listener.detachFrom(listener.attachedTo)
        listener.attachTo(dnode)
      }
    }
  }
  next () {
    // TODO: nullify the nodes when hasNextNode is false?
    let hasNextNode = false
    const isTnode = this.nodeB.nodeType === 3
    const isChildComponent = this.nodeB instanceof Component &&
      this.nodeB !== this.component
    const isLeaf = isTnode || isChildComponent

    if (isLeaf) {
      hasNextNode = this._upAndAcross()
    } else if (this.nodeB.firstChild) { // TODO: this firstChild call can be optimized
      hasNextNode = this._downAndLeft()
    } else {
      hasNextNode = this._upAndAcross()
    }

    return hasNextNode
  }
  _downAndLeft () {
    if (!this.nodeB.firstChild) return false

    this.nodeB = this.nodeB.firstChild
    // TODO: a lot of the logic over the next ~8 lines looks pretty similar to
    // that of _upAndAcross, would be nice to refactor it somehow...
    const nextNodeA = this.nodeA.firstChild
    const [a, b] = [this.nodeA, this.nodeB]
    const mismatch = (a.nodeType !== b.nodeType) ||
      (
        a && b && a.tagName && b.tagName &&
        a.tagName.toLowerCase() !== b.tagName.toLowerCase()
      )

    const liveNodeA = this.nodeB.mounted
    if (!nextNodeA) {
      this.nodeA.appendChild(liveNodeA)
    } else if (mismatch || nextNodeA !== liveNodeA) {
      this.nodeA.replaceChild(liveNodeA, nextNodeA)
    }
    this.nodeA = this.nodeA.firstChild
    return true
  }
  _upAndAcross () {
    while (!this.nodeB.nextSibling && this.nodeB.parentNode) {
      this._clean(this.nodeA.nextSibling)
      this.nodeB = this.nodeB.parentNode
      this.nodeA = this.nodeA.parentNode
    }
    if (!this.nodeB.parentNode) return false

    this.nodeB = this.nodeB.nextSibling
    const nextNodeA = this.nodeA.nextSibling
    const [a, b] = [this.nodeA, this.nodeB]
    const mismatch = (a.nodeType !== b.nodeType) ||
      (
        a && b && a.tagName && b.tagName &&
        a.tagName.toLowerCase() !== b.tagName.toLowerCase
      )

    const liveNodeA = this.nodeB.mounted
    if (!nextNodeA) {
      this.nodeA.parentNode.appendChild(liveNodeA)
    } else if (mismatch || nextNodeA !== liveNodeA) {
      nextNodeA.parentNode.replaceChild(liveNodeA, nextNodeA)
    }
    this.nodeA = this.nodeA.nextSibling
    return true
  }
  _clean (node) {
    if (!node || !node.parentNode) return

    while (node) {
      const next = node.nextSibling
      node.parentNode.removeChild(node)
      node = next
    }
  }
}

