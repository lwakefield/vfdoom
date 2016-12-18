/* globals Text */
import Component from './component'
import {
  Vnode,
  Tnode,
  VFunctionalNode,
} from './nodes'

const boundAttr = /:(.+)/
const boundEvent = /@(.+)/
const iFor = /i-for/
const iIf = /i-if/

export default class Compiler {
  /**
   * We want to be able to compile a DOM into something virtual
   */
  stack = []
  result = null
  constructor (el) {
    this.result = new Component(el.tagName)
    this.stack = [[el, this.result]]
  }
  next () {
    const [dnode, vnode] = this.stack.pop()

    const childNodes = Array.from(dnode.childNodes || []).map(child_dnode => {
      let child_vnode

      // build child_vnode from child_dnode
      if (child_dnode instanceof Text) {
        child_vnode = new Tnode(child_dnode.textContent)
      } else {
        child_vnode = new Vnode(child_dnode.tagName)
      }

      vnode.addChild(child_vnode)
      return [child_dnode, child_vnode]
    })

    if (!childNodes.length) return

    childNodes.reverse()
    this.stack.push(...childNodes)
  }
  isDone () {
    return this.stack.length === 0
  }
}
