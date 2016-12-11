import Node from './node'

export class Tnode extends Node {
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

