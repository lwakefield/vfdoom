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
    this.result = this.process(el, new Vnode(el.tagName))
    this.stack = [[el, this.result]]
  }
  next () {
    const [dnode, vnode] = this.stack.pop()

    const childNodes = Array.from(dnode.childNodes || []).map(child_dnode => {
      let child_vnode

      // build child_vnode from child_dnode
      if (child_dnode instanceof Text) {
        const text = child_dnode.textContent
        child_vnode = new Tnode(
          text.match(hasInterpolation)
          ? sandbox(new Function('return `' + text + '`'))
          : text
        )
        vnode.addChild(child_vnode)
      } else if (isFunctionalNode(child_dnode)){
        child_vnode = new Vnode(child_dnode.tagName)
        child_vnode = this.addAttributes(child_dnode, child_vnode)
        const fn_vnode = this.makeFunctional(child_dnode, child_vnode)
        vnode.addChild(fn_vnode)
      } else {
        child_vnode = new Vnode(child_dnode.tagName)
        child_vnode = this.addAttributes(child_dnode, child_vnode)
        vnode.addChild(child_vnode)
      }

      return [child_dnode, child_vnode]
    })

    if (!childNodes.length) return

    childNodes.reverse()
    this.stack.push(...childNodes)
  }
  addAttributes (dnode, vnode) {
    for (const {name, value} of Array.from(dnode.attributes)) {
      if (name.match(boundEvent)) {
        // TODO: finish this
      } else if (!name.match(iIf) && !name.match(iFor)) {
      } else if (name.match(boundAttr)) {
        const [, attrName] = name.match(boundAttr)
        const fn = new Function(`return ${value}`)
        vnode.addAttribute(new VAttribute(attrName, sandbox(fn)))
      } else if (value.match(hasInterpolation)) {
        const fn = new Function('return `' + value + '`')
        vnode.addAttribute(new VAttribute(name, sandbox(fn)))
      } else {
        vnode.addAttribute(new VAttribute(name, value))
      }
    }
    return vnode
  }
  makeFunctional (dnode, vnode) {
    let condition = null
    let forVars = []
    for (const {name, value} of Array.from(dnode.attributes)) {
      if (name.match(iIf)) {
        condition = value
      } else if (name.match(iFor)) {
        const [, local, loopOver] = value.match(iForVars)
        forVars = [local.trim(), loopOver.trim()]
      }
    }

    let fn = null
    if (condition && forVars.length) {
      const [local, loopOver] = forVars
      fn = new Function(`
        return ${loopOver}.reduce((result, ${local}) => {
          if (${condition}) result.push({${local}})
          return result
        }, [])
      `)
    } else if (forVars.length) {
      const [local, loopOver] = forVars
      fn = new Function(`return ${loopOver}.map(${local} => ({${local}}))`)
    } else if (condition) {
      fn = new Function(`return ${condition} ? [{}] : []`)
    }

    if (!fn) throw new Error('could not create functional node')

    const functionalNode = new VFunctionalNode(sandbox(fn))
    functionalNode.addChild(vnode)
    return functionalNode
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
      console.log(functionalNode);
      return functionalNode
    }
    return vnode
  }
  isDone () {
    return this.stack.length === 0
  }
}

export function isFunctionalNode (el) {
  for (const {name} of Array.from(el.attributes)) {
    if (name.match(iFor) || name.match(iIf)) return true
  }
  return false
}

export function compile (el) {
  const c = new Compiler(el)
  while (!c.isDone()) c.next()
  return c.result
}
