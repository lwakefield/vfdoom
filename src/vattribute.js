export default class VAttribute {
  parentNode = null
  constructor (name, value) {
    this.name = name
    this.value = value
  }
  get value () {
    return this._value instanceof Function
      ? this._value(this.parentNode.scope) : this._value
  }
  set value (val) {
    this._value = val
  }
}
