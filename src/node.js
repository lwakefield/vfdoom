export default class Node {
  childNodes = []
  parentNode = null
  prevSibling = null
  nextSibling = null
  mounted = null

  constructor () {
    // TODO: should this be an underscored var?
    this.args = arguments
  }

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
     * We need to accomodate for VForNodes and the chance that they may be
     * empty.
     * This means that as we come across VForNodes we will compile them and
     * traverse them to find the first tnode or vnode.
     *
     */
    let node = (this.childNodes && this.childNodes.length)
      ? this.childNodes[0] : null
    while (node && (node.type === 'VForNode')) {
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
  //   // TODO: I am not yet sure if we need to do the same as above to check
  //   for
  //   // empty VForNodes...
  // }

  get type () {
    return this.constructor.name
  }

  get scope () {
    /**
     * Scope is passed downstream. Props can be thought of as isolated scoped
     * variables that have been explicitly passed in.
     */
    const parentScope = this.parentNode ? this.parentNode.scope : {}
    return Object.assign({}, this._props, this._scope, parentScope)
  }
  set scope (val) {
    this._scope = val
  }

  get props () {
    if (!this._props) {
      this._props = {}
    }
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

    let child = this.firstChild
    while (child) {
      inst.addChild(child.clone())
      child = child.nextSibling
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
        throw new Error('cannot create dom node for: ', this)
      }
    }
    return this._mounted
  }
  set mounted (val) { this._mounted = val }
}

