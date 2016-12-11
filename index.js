const noop = () => {}

class Traverser {
  constructor (root) {
    this.stack = [root]
  }
  next () {
    if (!this.stack.length) return null

    const node = this.stack.pop()

    const children = node.childNodes
    children.reverse()
    this.stack.push(...children)

    return node
  }
}

export function traverse(root) {
  return new Traverser(root)
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

