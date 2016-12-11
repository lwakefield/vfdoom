import Component from './component'
import {observe, proxy} from './util'

export default class Iota extends Component {
  $methods = {}
  $data = observe({}, () => this.patch())
  constructor (el, options = {}) {
    super(...arguments)
    this.mount(el)

    const data = options.data
    if (data) {
      Object.assign(this.$data, data instanceof Function ? data() : data)
    }
    Object.assign(this.$methods, options.methods || {})

    proxy(this, this.$data)
    proxy(this, this.$methods)
  }
  get scope () {
    return Object.assign({}, this.$data, this.$methods, super.scope)
  }
  set scope (val) {
    super.scope = val
  }
}

