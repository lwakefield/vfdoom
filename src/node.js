import {isFunctionalNode} from './util'

export default class Node {
  childNodes = []
  parentNode = null
  prevSibling = null
  nextSibling = null
  mounted = null

  props = null
  scope = null

  constructor () {
    // TODO: should this be an underscored var?
    this.args = arguments
  }

  get childNodes () {
    return this._childNodes
  }

  set childNodes (val) {
    this._childNodes = val
  }

  addChild (child) {
    this.childNodes.push(child)
    child.parentNode = this

    // TODO try and cache references to childNodes because they might contain
    // getters
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
     * We need to accomodate for VFunctionalNodes and the chance that they may be
     * empty.
     * This means that as we come across VFunctionalNodes we will compile them and
     * traverse them to find the first tnode or vnode.
     *
     */
    let node = (this.childNodes && this.childNodes.length)
      ? this.childNodes[0] : null
    while (node && node.isFunctionalNode) {
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
    this._nextSibling = sibling
  }

  get nextSibling () {
    let next = this._nextSibling
    if (next && next.isFunctionalNode) {
      const child = next.firstChild
      if (child) return child
      return next.nextSibling
    }
    return next
  }

  get type () {
    return this.constructor.name
  }

  get scope () {
    // TODO: cache this call somehow...
    // We don't want to have to reassign every time as it is expensive.
    /**
     * Scope is passed downstream. Props can be thought of as isolated scoped
     * variables that have been explicitly passed in.
     */
    if (!this._props && !this._scope) {
      return this.parentNode.scope
    }

    const parentScope = this.parentNode ? this.parentNode.scope : {}
    return {
      ...this._props,
      ...this._scope,
      ...parentScope,
    }
  }
  set scope (val) {
    this._scope = val
  }

  get props () {
    return this._props
  }

  set props (val) {
    this._props = val
  }

  clone () {
    /**
     * Cloning a node will return a node that is de-associated it with it's
     * parent and siblings.
     */
    const inst = new this.constructor(...this.args)

    let child = this._childNodes && this._childNodes.length
      ? this._childNodes[0] : null
    while (child) {
      inst.addChild(child.clone())
      child = child._nextSibling
    }
    return inst
  }
  isMounted () {
    return !!this._mounted
  }
  get mounted () {
    if (!this._mounted) {
      const type = this.type
      if (type === 'Tnode') {
        this._mounted = document.createTextNode(this.text)
      } else if (type === 'Vnode') {
        this._mounted = document.createElement(this.tagName)
      } else if (type === 'Component' || type === 'Iota') {
        this._mounted = document.createElement(this.tagName)
      } else {
        throw new Error(`cannot create dom node for: ${type}`)
      }
    }
    return this._mounted
  }
  set mounted (val) { this._mounted = val }
}

