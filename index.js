const noop = () => {}
const newEl = (tagName) => document.createElement(tagName)

export class Node {
  children = []
  parentNode = null
  prevSibling = null
  nextSibling = null

  addChild (child) {
    this.children.push(child)
    child.parentNode = this

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
  get children () {
    throw new Error('Text node cannot have children')
  }
  set children (val) {
    throw new Error('Text node cannot have children')
  }
}

export class Vfnode extends Node {
  constructor (fn = noop) {
    super()
    this.fn = fn
  }
  get children () {
    // We expect fn() to return an array of unconnected children
    const children = this.fn()
    const len = children.length
    if (!len) return children

    // Now we connect the children
    const join = (nodeA, nodeB) => {
      nodeA.nextSibling = nodeB
      nodeB.prevSibling = nodeA
    }

    children[0].prevSibling = this.prevSibling
    for (let i = 0; i < len - 1; i++) {
      join(children[i], children[i+1])
      children[i].parentNode = this.parentNode
    }
    children[len-1].nextSibling = this.nextSibling
    children[len-1].parentNode = this.parentNode

    return children
  }
  set children (val) {}
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

    // _patchAttrs(mounted, nodeB)
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
  _down () {
    if (!this.nodeB.firstChild) return false

    this.nodeB = this.nodeB.firstChild
    if (!this.nodeA.firstChild) {
      this.nodeA.appendChild(this._createDomNode(this.nodeB))
    }
    this.nodeA = this.nodeA.firstChild
    return true
  }
  _across () {
    if (!this.nodeB.nextSibling) return false

    this.nodeB = this.nodeB.nextSibling
    if (!this.nodeA.nextSibling) {
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
    if (!this.nodeA.nextSibling) {
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
        childA.parentNode.appendChild(emptyNode)
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

