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
const iForVars = /(.+) of (.+)/
const iIf = /i-if/
const hasInterpolation = /\${.*}/

export default class Compiler {
  /**
   * We want to be able to compile a DOM into something virtual
   */
  stack = []
  result = null
  constructor (el) {
    this.result = this.process(el, new Component(el.tagName))
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
    let ifCondition = null
    let forVars = []

    for (const attr of Array.from(dnode.attributes)) {
      const name = attr.name
      const val = attr.value

      if (name.match(boundEvent)) {
        // TODO: finish this
      } else if (name.match(iIf)) {
        ifCondition = val
      } else if (name.match(iFor)) {
        const [, local, loopOver] = val.match(iForVars)
        forVars = [local.trim(), loopOver.trim()]
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

    if (ifCondition || forVars.length) {
      let fn = null
      if (ifCondition && forVars.length) {
        const [local, loopOver] = forVars
        fn = new Function(`
          return ${loopOver}.reduce((result, ${local}) => {
            if (${ifCondition}) result.push({${local}})
            return result
          }, [])
        `)
      } else if (forVars.length) {
        const [local, loopOver] = forVars
        fn = new Function(`return ${loopOver}.map(${local} => ({${local}}))`)
      } else if (ifCondition) {
        fn = new Function(`return ${ifCondition} ? [{}] : []`)
      }
      const functionalNode = new VFunctionalNode(sandbox(fn))
      functionalNode.addChild(vnode)
      return functionalNode
    }

    return vnode
  }
  isDone () {
    return this.stack.length === 0
  }
}
