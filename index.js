const noop = () => {}
const newEl = (tagName) => document.createElement(tagName)
const nodeTypeMismatch = (a, b) => {
  if (!a || !b) return false
  if (a instanceof Text && b instanceof Tnode) return true
  if (!a.tagName || !b.tagName) return false
  return a.tagName.toLowerCase() !== b.tagName.toLowerCase()
}

/**
 * Ideally we want to keep our vdom as clean as possible. This is easy if the
 * vdom is static. Here are some things to consider if the structure changes:
 *  - persisting scope
 *  - traversing
 *  - performance and caching
 *  - reusing old nodes
 * It might be worth introducing the concept of template or blueprint nodes.
 * This is only really relevant for vfnodes. But also slightly relevant for
 * interpolation of attrs and tnodes.
 */

export class Node {
  childNodes = []
  parentNode = null
  _prevSibling = null
  _nextSibling = null

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
    /**
     * We need to accomodate for vfnodes and the chance that they may be empty.
     * This means that as we come across vfnodes we will compile them and 
     * traverse them to find the first tnode or vnode.
     *
     */
    let node = this.childNodes.length ? this.childNodes[0] : null
    while (node && node instanceof Vfnode) {
      const child = node.firstChild
      if (!child) {
        node = node.nextSibling
      } else {
        node = child
      }
    }
    return node
  }

  set nextSibling (sibling) {
    // TODO: I am not yet sure if we need to do the same as above to check for
    // empty vfnodes...
    this._nextSibling = sibling
  }
  get nextSibling () {
    let node = this._nextSibling
    return this._nextSibling
  }
  set prevSibling (sibling) {
    this._prevSibling = sibling
  }
  get prevSibling () {
    return this._prevSibling
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
  el = null
  patcher = null
  constructor (componentName, tagName='div') {
    super()
    this.componentName = componentName
    this.tagName = tagName
  }
  recycle (node) {
    if (!node.parentNode) return
    node.parentNode.removeChild(node)
  }
  mount (el) {
    this.el = el
    this.patcher = new Patcher(this.el, this)
  }
  patch () {
    this.patcher.reset()
    while (this.patcher.patch() && this.patcher.next());
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
  get childNodes () { }
  set childNodes (val) { }
}

export class Vfnode extends Node {
  /**
   * We expect the children of a vfnode are probably vnodes. We are not
   * expecting nested vfnodes. If this is something that exists, then you should
   * consider combining the vfnodes into a single function.
   */
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
    for (let i = 0; i < len; i++) {
      if (i == 0) {
        childNodes[0].prevSibling = this.prevSibling
      }
      if (i == len - 1) {
        childNodes[len - 1].nextSibling = this.nextSibling
      } else {
        join(childNodes[i], childNodes[i+1])
      }
      childNodes[i].parentNode = this.parentNode
      childNodes[i].mountPoint = this.mountPoint
    }

    return childNodes
  }
  set childNodes (val) {}
}

export class Patcher {
  /**
   * Both next() and patch() are integral to the patching process. next() is
   * responsible for creating/removing/reordering nodes in the tree. patch() is
   * responsible for adding attributes and event listeners.
   * TODO: make sure that stray child nodes are removed.
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

    const mountKey = `${nodeB.mountPoint}.${nodeB.key || 0}`

    let mounted = component.mounted.get(mountKey)
    if (mounted && nodeA !== mounted) {
      component.recycle(nodeA)
      nodeA = mounted
    } else if (!mounted) {
      component.mounted.set(mountKey, nodeA)
      mounted = nodeA
    }

    if (nodeB instanceof Tnode) {
      nodeA.textContent = nodeB.text
      return true
    } else if (nodeB instanceof Component && nodeB !== this.component) {
      if (!nodeB.el) nodeB.mount(nodeA)
      nodeB.patch()
      return true
    }

    this._patchAttrs(mounted, nodeB)
    return true
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
  next () {
    // TODO: nullify the nodes when hasNextNode is false?
    let hasNextNode = false
    const isTnode = this.nodeB instanceof Tnode
    const isChildComponent = this.nodeB instanceof Component &&
      this.nodeB !== this.component
    const isLeaf = isTnode || isChildComponent
    if (isLeaf) {
      hasNextNode = this._upAndAcross()
    } else if (this.nodeB.firstChild) {
      hasNextNode = this._downAndLeft()
    } else {
      hasNextNode = this._upAndAcross()
    }

    return hasNextNode
  }
  _downAndLeft () {
    if (!this.nodeB.firstChild) return false

    this.nodeB = this.nodeB.firstChild
    const nextNodeA = this.nodeA.firstChild
    const mismatch = nodeTypeMismatch(nextNodeA, this.nodeB)
    const liveNodeA = this._getMountedOrCreateNode(this.nodeB)
    if (!nextNodeA) {
      this.nodeA.appendChild(liveNodeA)
    } else if (mismatch || nextNodeA !== liveNodeA) {
      this.nodeA.replaceChild(liveNodeA, nextNodeA)
    }
    this.nodeA = this.nodeA.firstChild
    return true
  }
  _upAndAcross () {
    /**
     * We will have to deal with vfnodes here. There are a couple of cases which
     * we need to consider when the vfnode is empty.
     * 1. if the vfnode has a sibling, we should continue to that
     *   a. what if the sibling is also an empty vfnode
     * 2. if the vfnode does not have a sibling, we should continue upward
     */
    while (!this.nodeB.nextSibling && this.nodeB.parentNode) {
      this.nodeB = this.nodeB.parentNode
      this.nodeA = this.nodeA.parentNode
    }
    if (!this.nodeB.parentNode) return false

    this.nodeB = this.nodeB.nextSibling
    const nextNodeA = this.nodeA.nextSibling
    const mismatch = nodeTypeMismatch(nextNodeA, this.nodeB)
    const liveNodeA = this._getMountedOrCreateNode(this.nodeB)
    if (!nextNodeA) {
      this.nodeA.parentNode.appendChild(liveNodeA)
    } else if (mismatch || nextNodeA !== liveNodeA) {
      nextNodeA.parentNode.replaceChild(liveNodeA, nextNodeA)
    }
    this.nodeA = this.nodeA.nextSibling
    return true
  }
  _getMountedOrCreateNode (node) {
    const mountKey = `${node.mountPoint}.${node.key || 0}`
    let mounted = this.component.mounted.get(mountKey)
    if (mounted) return mounted

    if (node instanceof Tnode) return document.createTextNode(node.text)
    if (node instanceof Vnode) return document.createElement(node.tagName)
    if (node instanceof Component) return document.createElement(node.tagName)

    throw new Error('cannot create dom node for: ', node)
  }
}

export function sandbox (fnOrString, scope={}) {
  let src = null
  if (fnOrString instanceof Function)    src = `(${fnOrString.toString()})()`
  else if (fnOrString instanceof String) src = fnOrString
  else throw new Error('cannot create sandbox for: ', fnOrString)

  const fn = new Function('scope', `
    with (scope) return ${src}
  `)
  return fn.bind(null, scope)
}
