import Node from './node'

export default class Vnode extends Node {
  attributes = []
  constructor (tagName = 'div') {
    super(...arguments)
    this.tagName = tagName
  }
}
