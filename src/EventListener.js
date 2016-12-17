// TODO add .spec
// TODO make sure this works inside of VFunctionalNodes
export default class EventListener {
  parentNode = null
  constructor (type, handler) {
    this.type = type
    this.handler = handler
  }
  attachTo (el) {
    el.addEventListener(this.type, this.handler)
  }
  detachFrom (el) {
    el.removeEventListener(this.type, this.handler)
  }
}

