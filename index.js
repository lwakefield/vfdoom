const noop = () => {}
const newEl = (tagName) => document.createElement(tagName)

export class Node {
  children = []
  parent = null
  prevSibling = null
  nextSibling = null

  addChild (child) {
    this.children.push(child)
    child.parent = this

    const len = this.children.length
    if (len < 2) return

    const lastChild = this.children[len - 2]
    lastChild.nextSibling = child
    child.prevSibling = lastChild
  }

  get firstChild () {
    const children = this.children
    return children.length ? children[0] : null
  }
}

export class Component extends Node {
  attributes = []
  mounted = new Map()
  recycled = {}
  constructor (componentName, tagName='div') {
    super()
    this.componentName = componentName
    this.tagName = tagName
  }
  recycle (node) {
    const mountKey = node._mountKey
    if (mountKey) {
      mounted[mountKey] = node
    }
    node.parent.removeChild(node)
  }
}

export class Vnode extends Node {
  attributes = []
  constructor (tagName) {
    super()
    this.tagName = tagName
  }
}

export class Vfnode extends Node {
  constructor (fn = noop) {
    super()
    this.fn = fn
  }
  get children () {
    return this.fn()
  }
}

export class Patcher {
  mountPoint = 0
  constructor (node, component) {
    this.component = component
    this.nodeA = node
    this.nodeB = node
  }
  patch () {
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

    if (hasNextNode) this.mountPoint++

    return hasNextNode
  }
  _down () {
    this.nodeB = this.nodeB.firstChild
    if (!this.nodeA.firstChild) {
      this.nodeA.appendChild(newEl(this.nodeB.tagName))
    }
    this.nodeA = this.nodeA.firstChild
    return this.nodeB
  }
  _across () {
    this.nodeB = this.nodeB.nextSibling
    if (!this.nodeB.nextSibling) {
      this.nodeA.parent.appendChild(newEl(this.nodeB.tagName))
    }
    this.nodeA = this.nodeA.nextSibling
    return this.nodeB
  }
  _upAndAcross () {
    if (!this.nodeB.parent.nextSibling) return undefined

    while (!this.nodeB.parent.nextSibling) {
      this.nodeB = this.nodeB.parent
      this.nodeA = this.nodeA.parent
    }
    this.nodeB = this.nodeB.parent.nextSibling
    if (!this.nodeA.parent.nextSibling) {
      this.nodeA.parent.parent.appendChild(newEl(this.nodeB.tagName))
    }
    this.nodeA = this.nodeA.parent.nextSibling
    return this.nodeB
  }
}

/**
 * The top level node must be a component, because we need to manage which
 * vnodes are mounted at any given time
 */
function patch(node, component) {
  let mountPoint = 0

  function _patch(nodeA, nodeB) {
    if (!nodeB.mountPoint) nodeB.mountPoint = mountPoint++
    const mountKey = `${node.mountPoint}.${nodeB.key || 0}`

    const mounted = component.mounted[mountKey]
    if (mounted && nodeA !== mounted) {
      component.recycle(nodeA)
      nodeA = mounted
    } if (!mounted) {
      component.mounted[mountKey] = nodeA
    }

    _patchChildren(nodeA, nodeB)
  }

  function _patchChildren(nodeA, nodeB) {
    let childA = nodeA.firstChild
    let childB = nodeB.firstChild
    while (childA && childB) {
      if (childB instanceof Vfnode) {
        childB = childB.firstChild
        _giveFunctionalChildrenMountPoint(childB)
        continue
      }
      _patch(childA, childB)

      childB = childB.nextSibling
      // There is a next round and we dont have a real DOM node ready...
      if (childB && !childA.nextSibling) {
        const emptyNode = document.createChild(childB.tagName)
        childA.parent.appendChild(emptyNode)
      }
      childA = childA.nextSibling
    }
    cleanUp(childA)
  }

  function cleanUp(node) {
    while (node) {
      component.recycle(node)
      node = node.nextSibling
    }
  }

  function _giveFunctionalChildrenMountPoint(child) {
    while (child) child.mountPoint = mountPoint
  }
}

