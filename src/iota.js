import Component from './component'
import {observe} from './util'

export default class Iota extends Component {
  $methods = {}
  constructor (el) {
    super(...arguments)
    this.mount(el)
    this.$data = observe({}, () => this.patch())
  }
  get scope () {
    return Object.assign({}, this.$data, this.$methods, super.scope)
  }
  set scope (val) {
    super.scope = val
  }
}

