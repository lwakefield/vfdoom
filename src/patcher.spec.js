/* eslint-env mocha */
import {expect} from 'chai'
import jsdom from 'jsdom'

import {
  Vnode,
  Tnode,
  Component,
} from './nodes'
import sandbox from './sandbox'
import VAttribute from './vattribute'
import EventListener from './EventListener'
import Patcher from './patcher'

beforeEach(() => {
  const window = jsdom.jsdom().defaultView
  const document = window.document
  global['window'] = window
  global['document'] = document
  global['Text'] = window.Text
})

function normalizeHTML (html) {
  return html
  .split('\n')
  .map(v => v.trim())
  .filter(v => !!v)
  .join('')
}

describe('Patcher', () => {
  function newVTree () {
    //     A
    //    / \
    //   B   E
    //  / \
    // C   D
    const vnodeA = new Component('div')
    const vnodeB = new Vnode('div')
    const vnodeC = new Vnode('div')
    const vnodeD = new Vnode('div')
    const vnodeE = new Vnode('div')

    vnodeA.addChild(vnodeB)
    vnodeB.addChild(vnodeC)
    vnodeB.addChild(vnodeD)
    vnodeA.addChild(vnodeE)

    return [vnodeA, vnodeB, vnodeC, vnodeD, vnodeE]
  }
  function newDTree () {
    //     A
    //    / \
    //   B   E
    //  / \
    // C   D
    const dnodeA = document.createElement('div')
    const dnodeB = document.createElement('div')
    const dnodeC = document.createElement('div')
    const dnodeD = document.createElement('div')
    const dnodeE = document.createElement('div')

    dnodeA.appendChild(dnodeB)
    dnodeB.appendChild(dnodeC)
    dnodeB.appendChild(dnodeD)
    dnodeA.appendChild(dnodeE)

    return [dnodeA, dnodeB, dnodeC, dnodeD, dnodeE]
  }
  describe('next()', () => {
    it('iterates correctly', () => {
      const [vnodeA, vnodeB, vnodeC, vnodeD, vnodeE] = newVTree()
      const [dnodeA, dnodeB, dnodeC, dnodeD, dnodeE] = newDTree()

      const patcher = new Patcher(dnodeA, vnodeA)

      // TODO: patcher creates new nodes on first patch, we could potentially
      // reuse nodes if they haven't already been mounted

      expect(patcher.nodeA).to.eql(dnodeA)
      expect(patcher.nodeB).to.eql(vnodeA)

      expect(patcher.next()).to.be.ok
      expect(patcher.nodeA).to.not.eql(dnodeB)
      expect(patcher.nodeB).to.eql(vnodeB)

      expect(patcher.next()).to.be.ok
      expect(patcher.nodeA).to.not.eql(dnodeC)
      expect(patcher.nodeB).to.eql(vnodeC)

      expect(patcher.next()).to.be.ok
      expect(patcher.nodeA).to.not.eql(dnodeD)
      expect(patcher.nodeB).to.eql(vnodeD)

      expect(patcher.next()).to.be.ok
      expect(patcher.nodeA).to.not.eql(dnodeE)
      expect(patcher.nodeB).to.eql(vnodeE)

      expect(patcher.next()).to.not.be.ok
    })
    it('creates nodes as it iterates', () => {
      const [vnodeA] = newVTree()

      const dnodeA = document.createElement('div')
      const patcher = new Patcher(dnodeA, vnodeA)

      expect(patcher.next()).to.be.ok
      const dnodeB = patcher.nodeA
      expect(patcher.next()).to.be.ok
      const dnodeC = patcher.nodeA
      expect(patcher.next()).to.be.ok
      const dnodeD = patcher.nodeA
      expect(patcher.next()).to.be.ok
      const dnodeE = patcher.nodeA

      expect(dnodeA.firstChild).to.eql(dnodeB)
      expect(dnodeB.firstChild).to.eql(dnodeC)
      expect(dnodeB.firstChild.nextSibling).to.eql(dnodeD)
      expect(dnodeA.firstChild.nextSibling).to.eql(dnodeE)
    })
  })
  describe('reset()', () => {
    it('correctly resets', () => {
      const [nodeA, nodeB] = [new Vnode(), new Vnode()]
      const patcher = new Patcher(nodeA, nodeB)
      patcher.nodeA = null
      patcher.nodeB = null
      patcher.reset()
      expect(patcher.nodeA).to.eql(nodeA)
      expect(patcher.nodeB).to.eql(nodeB)
    })
  })
  describe('patch()', () => {
    it('patches correctly', () => {
      const [vnodeA, vnodeB, vnodeC, vnodeD, vnodeE] = newVTree()

      const dnodeA = document.createElement('div')
      vnodeA.mount(dnodeA)
      const patcher = vnodeA.patcher

      // Patch once!
      while (patcher.patch() && patcher.next());

      const dnodeB = dnodeA.firstChild
      const dnodeC = dnodeB.firstChild
      const dnodeD = dnodeC.nextSibling
      const dnodeE = dnodeB.nextSibling

      expect(vnodeA.mounted).to.eql(dnodeA)
      expect(vnodeB.mounted).to.eql(dnodeB)
      expect(vnodeC.mounted).to.eql(dnodeC)
      expect(vnodeD.mounted).to.eql(dnodeD)
      expect(vnodeE.mounted).to.eql(dnodeE)

      // Patch again!
      // We shouldn't see any changes..
      patcher.reset()
      while (patcher.patch() && patcher.next());

      expect(vnodeA.mounted).to.eql(dnodeA)
      expect(vnodeB.mounted).to.eql(dnodeB)
      expect(vnodeC.mounted).to.eql(dnodeC)
      expect(vnodeD.mounted).to.eql(dnodeD)
      expect(vnodeE.mounted).to.eql(dnodeE)

      // Let's interfere, then patch again!
      dnodeA.innerHTML = ''
      patcher.reset()
      while (patcher.patch() && patcher.next());

      expect(vnodeA.mounted).to.eql(dnodeA)
      expect(vnodeB.mounted).to.eql(dnodeB)
      expect(vnodeC.mounted).to.eql(dnodeC)
      expect(vnodeD.mounted).to.eql(dnodeD)
      expect(vnodeE.mounted).to.eql(dnodeE)
    })
    it('removes stray nodes', () => {
      //     A          A
      // ┌─┬─┼─┬─┐ -> ┌─┼─┐
      // B C D E F    B C D
      const nodeA = new Component()
      const [
        nodeB,
        nodeC,
        nodeD,
        nodeE,
        nodeF,
      ] = [
        new Vnode(),
        new Vnode(),
        new Vnode(),
        new Vnode(),
        new Vnode(),
      ]
      nodeA.addChild(nodeB)
      nodeA.addChild(nodeC)
      nodeA.addChild(nodeD)
      nodeA.addChild(nodeE)
      nodeA.addChild(nodeF)

      const dnodeA = document.createElement('div')
      nodeA.mount(dnodeA)

      nodeA.patch()

      expect(dnodeA.outerHTML).to.eql(
        '<div><div></div><div></div><div></div><div></div><div></div></div>'
      )

      nodeA.removeChild(nodeE)
      nodeA.removeChild(nodeF)
      nodeA.patch()

      expect(dnodeA.outerHTML).to.eql(
        '<div><div></div><div></div><div></div></div>'
      )
    })
    it('patches correctly if there are type mismatches', () => {
      const [vnodeA] = newVTree()

      const dnodeA = document.createElement('p')
      dnodeA.outerHTML = `
      <p>
          <p>
            <p></p>
            <p></p>
          </p>
          <p></p>
        </p>
      `
      vnodeA.mount(dnodeA)
      const patcher = vnodeA.patcher

      // Patch once!
      while (patcher.patch() && patcher.next());

      // TODO: the top level node should be adjusted as well
      expect(dnodeA.outerHTML).to.eql(
        '<p><div><div></div><div></div></div><div></div></p>'
      )
    })
    it('patches correctly with various tags and Tnodes', () => {
      //     A
      //    / \
      //   B   E
      //  / \
      // C   D
      const nodeA = new Component()
      const nodeB = new Vnode('p')
      const nodeC = new Vnode('hr')
      const nodeD = new Tnode('hello world')
      const nodeE = new Tnode('lorem ipsum')
      nodeA.addChild(nodeB)
      nodeB.addChild(nodeC)
      nodeB.addChild(nodeD)
      nodeA.addChild(nodeE)

      const domNodeA = document.createElement('div')
      const patcher = new Patcher(domNodeA, nodeA)

      // Patch once!
      while (patcher.patch() && patcher.next());
      expect(domNodeA.outerHTML).to.eql(
        '<div><p><hr>hello world</p>lorem ipsum</div>'
      )
    })
    it('patches correctly with nested Components', () => {
      //   A
      //  / \
      // B   E*
      // |   |
      // C   F
      // |   |
      // D   G
      const vnodeA = new Component()
      const vnodeB = new Vnode('section')
      const vnodeC = new Vnode('h1')
      const vnodeD = new Tnode('hello world')

      const vnodeE = new Component()
      const vnodeF = new Vnode('p')
      const vnodeG = new Tnode('lorem ipsum')

      vnodeA.addChild(vnodeB)
      vnodeB.addChild(vnodeC)
      vnodeC.addChild(vnodeD)

      vnodeA.addChild(vnodeE)
      vnodeE.addChild(vnodeF)
      vnodeF.addChild(vnodeG)

      const dnodeA = document.createElement('div')
      const patcher = new Patcher(dnodeA, vnodeA)

      // Patch once!
      for (let i = 0; i < 4; i++) {
        patcher.patch() && patcher.next()
      }
      // We are expecting this patch to be the final one of this instance of
      // patcher, because the nodeE Component whould handle patching of itself.
      expect(patcher.nodeB).to.eql(vnodeE)
      expect(patcher.patch() && patcher.next()).to.eql(false)

      const html = dnodeA.outerHTML
      expect(html).to.eql(normalizeHTML(`
        <div>
          <section>
            <h1>hello world</h1>
          </section>
          <div>
            <p>lorem ipsum</p>
          </div>
        </div>
      `))
    })
  })

  describe('_patchAttrs', () => {
    it('patches from scratch', () => {
      const vnode = new Vnode('div')
      vnode.attributes = [
        {name: 'id', value: 'foo'},
        {name: 'class', value: 'one two three'},
      ]
      const dnode = document.createElement('div')
      const patcher = new Patcher()

      patcher._patchAttrs(dnode, vnode)
      const html = dnode.outerHTML
      expect(html).to.eql('<div id="foo" class="one two three"></div>')
    })
    it('patches with dynamic attrs', () => {
      const vnode = new Vnode('div')
      vnode.scope = {className: 'one two three'}
      // eslint-disable-next-line no-undef
      const vattr = new VAttribute('class', sandbox(() => className))
      vattr.parentNode = vnode
      vnode.attributes = [
        {name: 'id', value: 'foo'},
        vattr,
      ]
      const dnode = document.createElement('div')
      const patcher = new Patcher()

      patcher._patchAttrs(dnode, vnode)
      const html = dnode.outerHTML
      expect(html).to.eql('<div id="foo" class="one two three"></div>')
    })
    it('overrides existing attrs', () => {
      const vnode = new Vnode('div')
      vnode.attributes = [
        {name: 'id', value: 'foo'},
        {name: 'class', value: 'one two three'},
      ]
      const dnode = document.createElement('div')
      dnode.setAttribute('id', 'bar')
      dnode.setAttribute('class', 'four five six')
      const patcher = new Patcher()

      patcher._patchAttrs(dnode, vnode)
      const html = dnode.outerHTML
      expect(html).to.eql('<div id="foo" class="one two three"></div>')
    })
    it('removes old attrs', () => {
      const vnode = new Vnode('div')
      vnode.attributes = [
        {name: 'id', value: 'foo'},
        {name: 'class', value: 'one two three'},
      ]
      const dnode = document.createElement('div')
      dnode.setAttribute('id', 'bar')
      dnode.setAttribute('class', 'four five six')
      dnode.setAttribute('style', 'border: 1px red;')
      const patcher = new Patcher()

      patcher._patchAttrs(dnode, vnode)
      const html = dnode.outerHTML
      expect(html).to.eql('<div id="foo" class="one two three"></div>')
    })
  })

  describe('_patchEventListeners', () => {
    it('patches from scratch', () => {
      const vnode = new Vnode('div')
      const listener = new EventListener()
      vnode.addEventListener(listener)

      const dnode = document.createElement('div')
      const patcher = new Patcher()

      patcher._patchEventListeners(dnode, vnode)
      expect(listener.attachedTo).to.eql(dnode)
    })
  })
})

