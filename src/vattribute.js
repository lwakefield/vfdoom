// TODO add .spec
// TODO make sure this works inside of VFunctionalNodes
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
  clone () {
    /**
     * Cloning returns a new VAttribute with the same name *and* the same
     * value, *but not pointing to the same parentNode*
     */
    return new VAttribute(this.name, this._value)
  }
}
