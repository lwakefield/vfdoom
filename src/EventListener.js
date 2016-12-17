// TODO make sure this works inside of VFunctionalNodes
export default class EventListener {
  parentNode = null
  attachedTo = null
  constructor (type, handler) {
    this.type = type
    this.handler = $event => {
      handler.call(this.parentNode.scope, $event)
    }
  }
  attachTo (el) {
    el.addEventListener(this.type, this.handler)
    this.attachedTo = el
  }
  detachFrom (el) {
    el.removeEventListener(this.type, this.handler)
  }
  clone () {
    /**
     * Cloning returns a new EventListener with the same type *and* the same
     * handler, *but not pointing to the same parentNode*
     */
    return new EventListener(this.type, this.handler)
  }
}
