/* globals Text */
import Component from './component'
import {
  Vnode,
  Tnode,
  VFunctionalNode,
} from './nodes'
import VAttribute from './vattribute'
import sandbox from './sandbox'

const boundAttr = /:(.+)/
const boundEvent = /@(.+)/
const iFor = /i-for/
const iIf = /i-if/
const hasInterpolation = /\${.*}/

export default class Compiler {
  /**
   * We want to be able to compile a DOM into something virtual
   */
  stack = []
  result = null
  constructor (el) {
    this.result = new Component(el.tagName)
    this.process(el, this.result)
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
        this.process(child_vnode)
      }

      vnode.addChild(child_vnode)
      return [child_dnode, child_vnode]
    })

    if (!childNodes.length) return

    childNodes.reverse()
    this.stack.push(...childNodes)
  }
  process (dnode, vnode) {
    for (const attr of Array.from(dnode.attributes)) {
      const name = attr.name
      const val = attr.value
      if (name.match(boundEvent)) {
      } else if (name.match(iFor)) {
      } else if (name.match(iIf)) {
      } else if (name.match(boundAttr)) {
        const [, attrName] = name.match(boundAttr)
        const fn = new Function(`return ${val}`)
        vnode.addAttribute(new VAttribute(attrName, sandbox(fn)))
      } else if (val.match(hasInterpolation)) {
        const fn = new Function('return `' + val + '`')
        vnode.addAttribute(new VAttribute(name, sandbox(fn)))
      } else {
        vnode.addAttribute(new VAttribute(name, val))
      }
    }
  }
  isDone () {
    return this.stack.length === 0
  }
}
