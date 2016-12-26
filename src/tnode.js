import Node from './node'

export default class Tnode extends Node {
  static nodeType = 3
  constructor (text) {
    super(...arguments)
    this._text = text
  }
  get text () {
    return this._text instanceof Function ? this._text(this.scope) : this._text
  }
  set text (val) {}
  get childNodes () { }
  set childNodes (val) { }
}

