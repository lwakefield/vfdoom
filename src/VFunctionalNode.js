import Node from './vnode'

export class VFunctionalNode extends Node {
  mountedNodes = new Map()
  constructor (...fns) {
    super(...arguments)
    this.fns = fns
  }
  get childNodes () {
    if (!this._blueprint) return []

    let propsForChildren = this.scope
    for (const fn of this.fns) {
      propsForChildren = fn(propsForChildren)
    }

    const hasKey = !!this._blueprint.key
    const children = propsForChildren.map((v, k) => {
      const props = Object.assign({$index: k}, v)
      const scope = Object.assign({}, this.scope, props)
      const key = hasKey ? this._blueprint.key(scope) : k

      let child = this.mountedNodes.get(key)

      if (!child) {
        child = this._blueprint.clone()
        this.mountedNodes.set(key, child)
      }

      child.props = props
    })

    this._linkChildren(children)
    return children
  }
  _linkChildren (childNodes) {
    const len = childNodes.length
    // Now we connect the childNodes
    const join = (nodeA, nodeB) => {
      nodeA.nextSibling = nodeB
      nodeB.prevSibling = nodeA
    }
    for (let i = 0; i < len; i++) {
      if (i === 0) {
        childNodes[0].prevSibling = this.prevSibling
      }
      if (i === len - 1) {
        childNodes[len - 1].nextSibling = this.nextSibling
      } else {
        join(childNodes[i], childNodes[i + 1])
      }
      childNodes[i].parentNode = this.parentNode
    }
  }
  set childNodes (val) {
    this._childNodes = val
  }
  get _blueprint () {
    return this._childNodes.length ? this._childNodes[0] : null
  }
  addChild (child) {
    if (this._childNodes.length > 0) {
      throw new Error(
        'A VForNode may only have a single child'
      )
    }
    child.parentNode = this
    this._childNodes.push(child)
  }
}


