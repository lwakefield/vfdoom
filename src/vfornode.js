import Node from './vnode'
import {objGet} from './util'

export class VForNode extends Node {
  _blueprint = null
  _childNodes = new Map()
  constructor (expression, keyedWith = null) {
    super(...arguments)
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
        const props = {$index: k}
        props[this.local] = v
        const scope = Object.assign({}, this.scope, props)

        const key = hasKey ? this._blueprint.key(scope) : k
        let child = this._childNodes.get(key)

        if (!child) {
          child = this._blueprint.clone()
          this._childNodes.set(key, child)
        }

        child.props = props

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
    throw new Error(
      'A VForNode may only have a single child, set with childNodes = '
    )
  }
}

