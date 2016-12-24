import Component from './component'
import {observe, proxy} from './util'
import {compile} from './Compiler'

export default class Iota extends Component {
  $methods = {}
  $data = observe({}, () => this.patcher && this.patch())
  constructor (el, options = {}) {
    super(el.tagName, ...arguments)

    const root = compile(el)
    for (const child of root.childNodes) {
      this.addChild(child)
    }

    const data = options.data
    if (data) {
      Object.assign(this.$data, data instanceof Function ? data() : data)
    }
    Object.assign(this.$methods, options.methods || {})

    proxy(this, this.$data)
    proxy(this, this.$methods)

    this.mount(el)
    this.patch()
  }
  get scope () {
    return Object.assign({}, this.$data, this.$methods, super.scope)
  }
  set scope (val) {
    super.scope = val
  }
}

