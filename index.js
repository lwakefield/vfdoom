const noop = () => {}
const newEl = (tagName) => document.createElement(tagName)
const nodeTypeMismatch = (a, b) => {
  if (!a || !b) return false
  if (a instanceof Text && b instanceof Tnode) return true
  if (!a.tagName || !b.tagName) return false
  return a.tagName.toLowerCase() !== b.tagName.toLowerCase()
}
export function objGet(obj, path) {
  const keys = path.split('.')
  return keys.reduce((curr, key) => {
    return curr != null && key in curr ? curr[key] : null
  }, obj)
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
  prevSibling = null
  nextSibling = null
  mounted = null
  _props = {}

  addChild (child) {
    this.childNodes.push(child)
    child.parentNode = this

    const len = this.childNodes.length
    if (len < 2) return

    const lastChild = this.childNodes[len - 2]
    lastChild.nextSibling = child
    child.prevSibling = lastChild
  }

  removeChild (child) {
    const index = this.childNodes.indexOf(child)
    this.childNodes.splice(index, 1)

    if (child.prevSibling) {
      child.prevSibling.nextSibling = child.nextSibling
    }
    if (child.nextSibling) {
      child.nextSibling.prevSibling = child.prevSibling
    }
    child.parentNode = null
  }

  get firstChild () {
    /**
     * We need to accomodate for vfnodes and the chance that they may be empty.
     * This means that as we come across vfnodes we will compile them and 
     * traverse them to find the first tnode or vnode.
     *
     */
    let node = (this.childNodes && this.childNodes.length) ? this.childNodes[0] : null
    while (node && (node instanceof Vfnode || node instanceof VForNode)) {
      const child = node.firstChild
      if (!child) {
        node = node.nextSibling
      } else {
        node = child
      }
    }
    return node
  }

  // set nextSibling (sibling) {
  //   // TODO: I am not yet sure if we need to do the same as above to check for
  //   // empty vfnodes...
  // }

  get scope () {
    /**
     * Scope is passed downstream. Props can be thought of as isolated scoped
     * variables that have been explicitly passed in.
     */
    if (!this._scope) {
      // Fetch the scope from upstream and cache the reference.
      this._scope = this.parentNode ? this.parentNode.scope : null
    }
    return Object.assign({}, this._props, this._scope)
  }
  set scope (val) {
    this._scope = val
  }

  clone () {
    /**
     * Cloning a node will return a node that is de-associated it with it's
     * parent and siblings.
     */
    const inst = this._newInstance()

    let child = this.firstChild
    while (child) {
      inst.addChild(child.clone())
      child = child.nextSibling
    }
    return inst
  }
  _newInstance () {
    return new this.constructor()
  }
  get mounted () {
    if (!this._mounted) {
      if (this instanceof Tnode) {
        this._mounted = document.createTextNode(this.text)
      } else if (this instanceof Vnode) {
        this._mounted = document.createElement(this.tagName)
      } else if (this instanceof Component) {
        this._mounted = document.createElement(this.tagName)
      } else {
        throw new Error('cannot create dom node for: ', this)
      }
    }
    return this._mounted
  }
  set mounted (val) { this._mounted = val }
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
  patcher = null
  constructor (componentName, tagName='div') {
    super()
    this.componentName = componentName
    this.tagName = tagName
    this.scope = {}
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
  _newInstance() {
    return new Component(this.componentName, this.tagName)
  }
}

export class Vnode extends Node {
  attributes = []
  constructor (tagName) {
    super()
    this.tagName = tagName
  }
  _newInstance() {
    return new Vnode(this.tagName)
  }
}

export class Tnode extends Node {
  constructor (text) {
    super()
    this._text = text
  }
  get text () {
    return this._text instanceof Function ? this._text(this.scope) : this._text
  }
  set text (val) {}
  get childNodes () { }
  set childNodes (val) { }
  _newInstance() {
    return new Tnode(this._text)
  }
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
    const childNodes = this.fn(this.scope)
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

export class VForNode extends Node {
  _blueprint = null
  _childNodes = new Map()
  constructor (expression, keyedWith=null) {
    super()
    const parsedExpression = VForNode._parseExpression(expression)
    this.local = parsedExpression.local
    this.from = parsedExpression.from
    this.keyedWith = keyedWith
  }
  static _parseExpression (expression) {
    const match = expression.match(/(.+)\s+(of|in)\s+(.+)/)
    return {local: match[1], from: match[3]}
  }
  get childNodes () {
    const from = objGet(this.scope, this.from)
    const hasKey = !!this._blueprint.key

    if (from instanceof Array) {
      const children = from.map((v, k) => {
        const key = hasKey ? this._blueprint.key(this.scope) : k
        let child = this._childNodes.get(key)

        if (!child) {
          child = this._blueprint.clone()
          this._childNodes.set(key, child)
        }

        child._props[this.local] = v
        child._props.$index = k

        return child
      })
      this._linkChildren(children)
      return children
    }

    return []
  }
  _linkChildren (childNodes) {
    const len = childNodes.length
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
  }
  set childNodes (val) {
    /**
     * We expect a VForNode to only have one child which will be used as a
     * template/blueprint
     */
    this._blueprint = val
  }
  addChild (child) {
    /**
     * We are not expecting this function to be called
     */
    throw new Error('A VForNode may only have a single child, set with childNodes = ')
  }
}

export class Vattribute {
  constructor (name, value) {
    this.name = name
    this.value = value
  }
  get value () {
    return this._value instanceof Function ? this._value() : this._value
  }
  set value (val) {
    this._value = val
  }
}

export class Patcher {
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
    // TODO: a lot of the logic over the next ~8 lines looks pretty similar to
    // that of _upAndAcross, would be nice to refactor it somehow...
    const nextNodeA = this.nodeA.firstChild
    const mismatch = nodeTypeMismatch(nextNodeA, this.nodeB)
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
    const mismatch = nodeTypeMismatch(nextNodeA, this.nodeB)
    const liveNodeA = this.nodeB.mounted
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
  _clean (node) {
    if (!node || !node.parentNode) return

    while (node) {
      const next = node.nextSibling
      node.parentNode.removeChild(node)
      node = next
    }
  }
}

export function sandbox (fnOrString) {
  let src = null
  if (fnOrString instanceof Function)    src = `(${fnOrString.toString()})()`
  else if (fnOrString instanceof String) src = fnOrString
  else throw new Error('cannot create sandbox for: ', fnOrString)

  const fn = new Function('scope', `
    with (scope || {}) return ${src}
  `)
  return fn
}
