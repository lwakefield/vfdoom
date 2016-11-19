const noop = () => {}
const newEl = (tagName) => document.createElement(tagName)
const nodeTypeMismatch = (a, b) => {
  if (!a || !b) return false
  if (!a.tagName || !b.tagName) return false
  return a.tagName.toLowerCase() !== b.tagName.toLowerCase()
}

export class Node {
  childNodes = []
  parentNode = null
  prevSibling = null
  nextSibling = null

  addChild (child) {
    this.childNodes.push(child)
    child.parentNode = this

    const len = this.childNodes.length
    if (len < 2) return

    const lastChild = this.childNodes[len - 2]
    lastChild.nextSibling = child
    child.prevSibling = lastChild
  }

  get firstChild () {
    const childNodes = this.childNodes
    return childNodes.length ? childNodes[0] : null
  }
}

export class Component extends Node {
  /**
   * A Component is a node, which is responsible for managing Vnodes, Vfnodes
   * and Components
   * Every nested child of a Component *must* have a mount point.
   * The management of the mount point is deferred to elsewhere, ie. not managed
   * by the Component
   */
  attributes = []
  mounted = new Map()
  recycled = {}
  constructor (componentName, tagName='div') {
    super()
    this.componentName = componentName
    this.tagName = tagName
  }
  recycle (node) {
    if (!node.parentNode) return
    node.parentNode.removeChild(node)
  }
}

export class Vnode extends Node {
  attributes = []
  constructor (tagName) {
    super()
    this.tagName = tagName
  }
}

export class Tnode extends Node {
  constructor (text) {
    super()
    this.text = text
  }
  get childNodes () {
    throw new Error('Text node cannot have childNodes')
  }
  set childNodes (val) {
    throw new Error('Text node cannot have childNodes')
  }
}

export class Vfnode extends Node {
  constructor (fn = noop) {
    super()
    this.fn = fn
  }
  get childNodes () {
    // We expect fn() to return an array of unconnected childNodes
    const childNodes = this.fn()
    const len = childNodes.length
    if (!len) return childNodes

    // Now we connect the childNodes
    const join = (nodeA, nodeB) => {
      nodeA.nextSibling = nodeB
      nodeB.prevSibling = nodeA
    }

    childNodes[0].prevSibling = this.prevSibling
    for (let i = 0; i < len - 1; i++) {
      join(childNodes[i], childNodes[i+1])
      childNodes[i].parentNode = this.parentNode
    }
    childNodes[len-1].nextSibling = this.nextSibling
    childNodes[len-1].parentNode = this.parentNode

    return childNodes
  }
  set childNodes (val) {}
}

export class Patcher {
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

    const mountKey = `${nodeB.mountPoint}.${nodeB.key || 0}`

    let mounted = component.mounted.get(mountKey)
    if (mounted && nodeA !== mounted) {
      component.recycle(nodeA)
      nodeA = mounted
    } else if (!mounted) {
      component.mounted.set(mountKey, nodeA)
      mounted = nodeA
    }

    this._patchAttrs(mounted, nodeB)
    return true
  }
  next () {
    let hasNextNode = false
    if (this.nodeB.firstChild) {
      hasNextNode = this._down()
    } else if (this.nodeB.nextSibling) {
      hasNextNode = this._across()
    } else {
      hasNextNode = this._upAndAcross()
    }

    return hasNextNode
  }
  _patchAttrs (dnode, vnode) {
    const dnodeAttrs = new Map()
    for (const attr of Array.from(dnode.attributes)) {
      dnodeAttrs.set(attr.name, true)
    }
    const vnodeAttrs = vnode.attributes || []
    for (const attr of vnodeAttrs) {
      dnode.setAttribute(attr.name, attr.value)
      dnodeAttrs.delete(attr.name)
    }
    for (const key of dnodeAttrs.keys()) {
      dnode.removeAttribute(key)
    }
  }
  _down () {
    if (!this.nodeB.firstChild) return false

    this.nodeB = this.nodeB.firstChild
    const nextNodeA = this.nodeA.firstChild
    const mismatch = nodeTypeMismatch(nextNodeA, this.nodeB)
    if (!nextNodeA || mismatch) {
      this.nodeA.appendChild(this._createDomNode(this.nodeB))
    }
    this.nodeA = this.nodeA.firstChild
    return true
  }
  _across () {
    if (!this.nodeB.nextSibling) return false

    this.nodeB = this.nodeB.nextSibling
    const nextNodeA = this.nodeA.nextSibling
    const mismatch = nodeTypeMismatch(nextNodeA, this.nodeB)
    if (!nextNodeA || mismatch) {
      this.nodeA.parentNode.appendChild(this._createDomNode(this.nodeB))
    }
    this.nodeA = this.nodeA.nextSibling
    return true
  }
  _upAndAcross () {
    while (!this.nodeB.nextSibling && this.nodeB.parentNode) {
      this.nodeB = this.nodeB.parentNode
      this.nodeA = this.nodeA.parentNode
    }
    if (!this.nodeB.parentNode) return false

    this.nodeB = this.nodeB.nextSibling
    const nextNodeA = this.nodeA.nextSibling
    const mismatch = nodeTypeMismatch(nextNodeA, this.nodeB)
    if (!nextNodeA || mismatch) {
      this.nodeA.parentNode.appendChild(this._createDomNode(this.nodeB))
    }
    this.nodeA = this.nodeA.nextSibling
    return true
  }
  _createDomNode (node) {
    const mountKey = `${node.mountPoint}.${node.key || 0}`
    let mounted = this.component.mounted.get(mountKey)
    return mounted || newEl(node.tagName)
  }
}
