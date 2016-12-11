/* eslint-env mocha */
import {expect} from 'chai'
import jsdom from 'jsdom'

import {
  Node,
  Vnode,
  Tnode,
  VForNode,
  Component,
  Patcher,
  sandbox,
  objGet,
  traverse,
} from './index.js'

function treeFromStr (str) {
  const relations = str.split('\n').map(v => v.trim()).filter(v => !!v)
  const nodeNames = new Set()
  for (const relation of relations) {
    const [left, right] = relation.split(' - ')
    nodeNames.add(left)
    nodeNames.add(right)
  }
  const nodes = new Map()
  for (const nodeName of nodeNames) {
    nodes.set(nodeName, new Vnode('div'))
  }
  for (const relation of relations) {
    const [left, right] = relation.split(' - ')
    const leftNode = nodes.get(left)
    const rightNode = nodes.get(right)
    leftNode.addChild(rightNode)
  }
  for (const node of nodes.values()) {
    if (!node.parentNode) return node
  }
}

function makeVnodes (tagName, amount) {
  const nodes = []
  for (let i = 0; i < amount; i++) {
    nodes.push(new Vnode(tagName))
  }
  return nodes
}

function normalizeHTML (html) {
  return html
  .split('\n')
  .map(v => v.trim())
  .filter(v => !!v)
  .join('')
}

describe.only('traverse', () => {
  it('functions correctly', () => {
    const nodeA = new Node()
    const nodeB = new Node()
    const nodeC = new Node()
    const nodeD = new Node()
    const nodeE = new Node()
    nodeA.addChild(nodeB)
    nodeB.addChild(nodeC)
    nodeB.addChild(nodeD)
    nodeA.addChild(nodeE)

    const traverser = traverse(nodeA)
    expect(traverser.next()).to.eql(nodeA)
    expect(traverser.next()).to.eql(nodeB)
    expect(traverser.next()).to.eql(nodeC)
    expect(traverser.next()).to.eql(nodeD)
    expect(traverser.next()).to.eql(nodeE)
    expect(traverser.next()).to.eql(null)
    expect(traverser.next()).to.eql(null)
  })
})

describe('Node', () => {
  it('adds a single child', () => {
    const nodeA = new Node()
    const nodeB = new Node()
    nodeA.addChild(nodeB)

    expect(nodeA.firstChild).to.eql(nodeB)
    expect(nodeA.childNodes[0]).to.eql(nodeB)
    expect(nodeB.parentNode).to.eql(nodeA)
  })

  it('adds two childNodes', () => {
    const nodeA = new Node()
    const nodeB = new Node()
    const nodeC = new Node()
    nodeA.addChild(nodeB)
    nodeA.addChild(nodeC)

    expect(nodeA.firstChild).to.eql(nodeB)
    expect(nodeA.childNodes[0]).to.eql(nodeB)
    expect(nodeB.parentNode).to.eql(nodeA)

    expect(nodeA.firstChild.nextSibling).to.eql(nodeC)
    expect(nodeA.childNodes[1]).to.eql(nodeC)
    expect(nodeB.nextSibling).to.eql(nodeC)
    expect(nodeC.parentNode).to.eql(nodeA)
    expect(nodeC.prevSibling).to.eql(nodeB)
  })

  describe('clone', () => {
    it('can be cloned', () => {
      const nodeA = new Node('one', 'two', 'three')
      expect(Array.from(nodeA.args)).to.eql(['one', 'two', 'three'])
      const nodeB = nodeA.clone()
      expect(nodeA === nodeB).to.eql(false)
    })
    it('sub classes can be cloned', () => {
      const nodeA = new Vnode('h1')
      expect(Array.from(nodeA.args)).to.eql(['h1'])
      const nodeB = nodeA.clone()
      expect(nodeA === nodeB).to.eql(false)
      expect(nodeB instanceof Vnode).to.eql(true)
      expect(nodeB.tagName).to.eql('h1')
    })
    // TODO: test cloning with child nodes
  })
})

describe('Vnode', () => {
  it('instatiates', () => {
    const vnode = new Vnode('div')

    expect(vnode).to.be.ok
    expect(vnode.tagName).to.eql('div')
  })
})

describe('Tnode', () => {
  it('instantiates', () => {
    expect(new Tnode()).to.be.ok
  })
  it('has static text', () => {
    const tnode = new Tnode('lorem ipsum')
    expect(tnode.text).to.eql('lorem ipsum')
  })
  it('has functional text', () => {
    const tnode = new Tnode(() => 'lorem ipsum')
    expect(tnode.text).to.eql('lorem ipsum')
  })
  it('has functional text with scope', () => {
    // eslint-disable-next-line no-undef
    const tnode = new Tnode(sandbox(() => m))
    tnode.scope = {m: 'lorem ipsum'}
    expect(tnode.text).to.eql('lorem ipsum')
  })
  it('inherits scope from parent', () => {
    const parent = new Vnode()
    parent.scope = {m: 'lorem ipsum'}
    // eslint-disable-next-line no-undef
    const tnode = new Tnode(sandbox(() => m))
    parent.addChild(tnode)
    expect(tnode.text).to.eql('lorem ipsum')
  })
})

describe('treeFromStr', () => {
  it('builds a simple tree', () => {
    const nodeA = treeFromStr(`
    A - B
    A - D
    B - C
    `)

    expect(nodeA).to.be.ok
    expect(nodeA).to.be.instanceof(Node)

    const nodeB = nodeA.firstChild
    expect(nodeB).to.be.ok
    expect(nodeB).to.be.instanceof(Node)
    expect(nodeB.parentNode).to.eql(nodeA)

    const nodeC = nodeB.firstChild
    expect(nodeC).to.be.ok
    expect(nodeC).to.be.instanceof(Node)
    expect(nodeC.parentNode).to.eql(nodeB)

    const nodeD = nodeA.childNodes[1]
    expect(nodeD).to.be.ok
    expect(nodeD).to.be.instanceof(Node)
    expect(nodeD.parentNode).to.eql(nodeA)
    expect(nodeB.nextSibling).to.eql(nodeD)
    expect(nodeD.prevSibling).to.eql(nodeB)
  })
})

describe('Patcher', () => {
  let window
  let document
  beforeEach(() => {
    window = jsdom.jsdom().defaultView
    document = window.document
    global['window'] = window
    global['document'] = document
    global['Text'] = window.Text
  })
  describe('next()', () => {
    // it('iterates correctly', () => {
    //   //     A
    //   //    / \
    //   //   B   E
    //   //  / \
    //   // C   D
    //   const nodeA = treeFromStr(`
    //     A - B
    //     B - C
    //     B - D
    //     A - E
    //   `)
    //   const nodeB = nodeA.firstChild
    //   const nodeC = nodeB.firstChild
    //   const nodeD = nodeC.nextSibling
    //   const nodeE = nodeB.nextSibling

    //   const patcher = new Patcher(nodeA, nodeA)

    //   expect(patcher.nodeB).to.eql(nodeA)

    //   expect(patcher.next()).to.be.ok
    //   expect(patcher.nodeB).to.eql(nodeB)

    //   expect(patcher.next()).to.be.ok
    //   expect(patcher.nodeB).to.eql(nodeC)

    //   expect(patcher.next()).to.be.ok
    //   expect(patcher.nodeB).to.eql(nodeD)

    //   expect(patcher.next()).to.be.ok
    //   expect(patcher.nodeB).to.eql(nodeE)

    //   expect(patcher.next()).to.not.be.ok
    // })
    it('patches from scratch', () => {
      //     A
      //    / \
      //   B   E
      //  / \
      // C   D
      const nodeA = new Component('app')
      const [
        nodeB,
        nodeC,
        nodeD,
        nodeE,
      ] = makeVnodes('div', 5)
      nodeA.addChild(nodeB)
      nodeB.addChild(nodeC)
      nodeB.addChild(nodeD)
      nodeA.addChild(nodeE)

      const domNodeA = document.createElement('div')
      const patcher = new Patcher(domNodeA, nodeA)

      expect(patcher).to.be.ok
      expect(patcher.nodeA).to.eql(domNodeA)
      expect(patcher.nodeB).to.eql(nodeA)

      expect(patcher.next()).to.be.ok
      expect(patcher.nodeB).to.eql(nodeB)
      // Check that it creates nodes as we go along
      const domNodeB = patcher.nodeA
      expect(domNodeB.parentNode).to.eql(domNodeA)
      expect(domNodeA.firstChild).to.eql(domNodeB)

      expect(patcher.next()).to.be.ok
      expect(patcher.nodeB).to.eql(nodeC)
      const domNodeC = patcher.nodeA
      expect(domNodeC.parentNode).to.eql(domNodeB)
      expect(domNodeB.firstChild).to.eql(domNodeC)

      expect(patcher.next()).to.be.ok
      expect(patcher.nodeB).to.eql(nodeD)
      const domNodeD = patcher.nodeA
      expect(domNodeD.parentNode).to.eql(domNodeB)
      expect(domNodeC.nextSibling).to.eql(domNodeD)

      expect(patcher.next()).to.be.ok
      expect(patcher.nodeB).to.eql(nodeE)
      const domNodeE = patcher.nodeA
      expect(domNodeE.parentNode).to.eql(domNodeA)
      expect(domNodeB.nextSibling).to.eql(domNodeE)

      expect(patcher.next()).to.not.be.ok

      expect(domNodeA.outerHTML).to.eql(
      normalizeHTML(
      `
        <div>
          <div>
            <div></div>
            <div></div>
          </div>
          <div></div>
        </div>
      `
      ))
    })
  })
  describe('patch()', () => {
    it('patches correctly', () => {
      //     A
      //    / \
      //   B   E
      //  / \
      // C   D
      const nodeA = new Component('app')
      const [
        nodeB,
        nodeC,
        nodeD,
        nodeE,
      ] = makeVnodes('div', 5)
      nodeA.addChild(nodeB)
      nodeB.addChild(nodeC)
      nodeB.addChild(nodeD)
      nodeA.addChild(nodeE)

      const domNodeA = document.createElement('div')
      nodeA.mount(domNodeA)
      const patcher = nodeA.patcher

      // Patch once!
      while (patcher.patch() && patcher.next());

      const domNodeB = domNodeA.firstChild
      const domNodeC = domNodeB.firstChild
      const domNodeD = domNodeC.nextSibling
      const domNodeE = domNodeB.nextSibling

      expect(nodeA.mounted).to.eql(domNodeA)
      expect(nodeB.mounted).to.eql(domNodeB)
      expect(nodeC.mounted).to.eql(domNodeC)
      expect(nodeD.mounted).to.eql(domNodeD)
      expect(nodeE.mounted).to.eql(domNodeE)

      // Patch again!
      // We shouldn't see any changes..
      patcher.reset()
      expect(patcher.nodeA).to.eql(domNodeA)
      expect(patcher.nodeB).to.eql(nodeA)

      while (patcher.patch() && patcher.next());
      expect(nodeA.mounted).to.eql(domNodeA)
      expect(nodeB.mounted).to.eql(domNodeB)
      expect(nodeC.mounted).to.eql(domNodeC)
      expect(nodeD.mounted).to.eql(domNodeD)
      expect(nodeE.mounted).to.eql(domNodeE)

      // Let's interfere, then patch again!
      patcher.reset()
      domNodeA.innerHTML = ''

      while (patcher.patch() && patcher.next());
      expect(nodeA.mounted).to.eql(domNodeA)
      expect(nodeB.mounted).to.eql(domNodeB)
      expect(nodeC.mounted).to.eql(domNodeC)
      expect(nodeD.mounted).to.eql(domNodeD)
      expect(nodeE.mounted).to.eql(domNodeE)
    })
    it('removes stray nodes', () => {
      //     A          A
      // ┌─┬─┼─┬─┐ -> ┌─┼─┐
      // B C D E F    B C D
      const nodeA = new Component('app')
      const [
        nodeB,
        nodeC,
        nodeD,
        nodeE,
        nodeF,
      ] = makeVnodes('div', 5)
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
      //     A
      //    / \
      //   B   E
      //  / \
      // C   D
      const nodeA = new Component('app')
      const [
        nodeB,
        nodeC,
        nodeD,
        nodeE,
      ] = makeVnodes('div', 5)
      nodeA.addChild(nodeB)
      nodeB.addChild(nodeC)
      nodeB.addChild(nodeD)
      nodeA.addChild(nodeE)

      const domNodeA = document.createElement('p')
      domNodeA.outerHTML = `
      <p>
          <p>
            <p></p>
            <p></p>
          </p>
          <p></p>
        </p>
      `
      nodeA.mount(domNodeA)
      const patcher = nodeA.patcher

      // Patch once!
      while (patcher.patch() && patcher.next());

      const domNodeB = domNodeA.firstChild
      const domNodeC = domNodeB.firstChild
      const domNodeD = domNodeC.nextSibling
      const domNodeE = domNodeB.nextSibling

      expect(nodeA.mounted).to.eql(domNodeA)
      expect(nodeB.mounted).to.eql(domNodeB)
      expect(nodeC.mounted).to.eql(domNodeC)
      expect(nodeD.mounted).to.eql(domNodeD)
      expect(nodeE.mounted).to.eql(domNodeE)
    })
    it('patches correctly with Tnodes', () => {
      //     A
      //    / \
      //   B   E
      //  / \
      // C   D
      const nodeA = new Component('app')
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
      const html = domNodeA.outerHTML
      expect(html).to.eql('<div><p><hr>hello world</p>lorem ipsum</div>')
    })
    it('patches correctly with nested Components', () => {
      //   A
      //  / \
      // B   E*
      // |   |
      // C   F
      // |   |
      // D   G
      const nodeA = new Component('app')
      const nodeB = new Vnode('section')
      const nodeC = new Vnode('h1')
      const nodeD = new Tnode('hello world')

      const nodeE = new Component('foo')
      const nodeF = new Vnode('p')
      const nodeG = new Tnode('lorem ipsum')

      nodeA.addChild(nodeB)
      nodeB.addChild(nodeC)
      nodeC.addChild(nodeD)

      nodeA.addChild(nodeE)
      nodeE.addChild(nodeF)
      nodeF.addChild(nodeG)

      const domNodeA = document.createElement('div')
      const patcher = new Patcher(domNodeA, nodeA)

      // Patch once!
      for (let i = 0; i < 4; i++) {
        patcher.patch() && patcher.next()
      }
      // We are expecting this patch to be the final one of this instance of
      // patcher, because the nodeE Component whould handle patching of itself.
      expect(patcher.nodeB).to.eql(nodeE)
      expect(patcher.patch() && patcher.next()).to.eql(false)

      const html = domNodeA.outerHTML
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
    it('patches correctly with VForNode children', () => {
      const nodeA = new Component('app')
      nodeA._scope.msgs = ['one', 'two', 'three']
      const nodeB = new VForNode('msg in msgs')
      const nodeC = new Vnode('p')
      // eslint-disable-next-line no-undef
      const nodeD = new Tnode(sandbox(() => `${$index} - ${msg}`))
      nodeA.addChild(nodeB)
      nodeB.childNodes = nodeC
      nodeC.addChild(nodeD)

      const dnode = document.createElement('div')
      nodeA.mount(dnode)
      nodeA.patch()
      expect(dnode.outerHTML).to.eql(
        '<div><p>0 - one</p><p>1 - two</p><p>2 - three</p></div>'
      )
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
})

describe('sandbox', () => {
  const fn = function () {
    return 'hello world'
  }
  it('initializes correctly', () => {
    const sandboxed = sandbox(fn)
    expect(sandboxed).to.be.ok
  })
  it('works correctly', () => {
    const sandboxed = sandbox(fn)
    expect(sandboxed()).to.eql('hello world')
  })
  it('works correctly with scope', () => {
    const fn = function () {
      // eslint-disable-next-line no-undef
      return msg
    }
    const scope = {msg: 'hello world'}
    const sandboxed = sandbox(fn)
    expect(sandboxed(scope)).to.eql('hello world')
    scope.msg = 'hello again world'
    expect(sandboxed(scope)).to.eql('hello again world')
  })
})

describe('objGet', () => {
  it('works correctly', () => {
    expect(objGet({foo: 'one'}, 'foo')).to.eql('one')
    expect(objGet({foo: {bar: 'two'}}, 'foo.bar')).to.eql('two')
    expect(objGet({foo: {bar: {baz: 'three'}}}, 'foo.bar.baz')).to.eql('three')
    expect(objGet({foo: {bar: {baz: 'three'}}}, 'foo.boo.baz')).to.eql(null)
  })
})

describe('VForNode', () => {
  it('instantiates correctly', () => {
    const node = new VForNode('foo of bar')
    expect(node).is.ok
  })
  it('sets blueprint correctly', () => {
    const nodeA = new VForNode('foo of bar')
    const nodeB = new Vnode('p')
    // eslint-disable-next-line
    const nodeC = new Tnode(sandbox(() => foo))

    nodeA.childNodes = nodeB
    nodeB.addChild(nodeC)

    expect(nodeA._blueprint).is.ok
  })
  it('creates children correctly', () => {
    const nodeA = new VForNode('foo of bar')
    const nodeB = new Vnode('p')

    nodeA.childNodes = nodeB
    nodeA.scope = {bar: ['one', 'two', 'three']}

    const childNodes = nodeA.childNodes
    expect(childNodes[0]._props).to.eql({foo: 'one', $index: 0})
    expect(childNodes[1]._props).to.eql({foo: 'two', $index: 1})
    expect(childNodes[2]._props).to.eql({foo: 'three', $index: 2})

    expect(nodeA._childNodes.get(0)).to.eql(childNodes[0])
    expect(nodeA._childNodes.get(1)).to.eql(childNodes[1])
    expect(nodeA._childNodes.get(2)).to.eql(childNodes[2])

    const childNodes1 = nodeA.childNodes
    expect(childNodes1[0]).to.eql(childNodes[0])
    expect(childNodes1[1]).to.eql(childNodes[1])
    expect(childNodes1[2]).to.eql(childNodes[2])
  })
  it('creates keyed children correctly', () => {
    const nodeA = new VForNode('foo of bar')
    const nodeB = new Vnode('p')
    nodeB.key = sandbox(() => foo) // eslint-disable-line no-undef

    nodeA.childNodes = nodeB
    nodeA.scope = {bar: ['one', 'two', 'three']}

    const childNodes = nodeA.childNodes
    expect(Array.from(nodeA._childNodes.keys())).to.eql(['one', 'two', 'three'])
    expect(childNodes[0]._props).to.eql({foo: 'one', $index: 0})
    expect(childNodes[1]._props).to.eql({foo: 'two', $index: 1})
    expect(childNodes[2]._props).to.eql({foo: 'three', $index: 2})

    expect(nodeA._childNodes.get('one')).to.eql(childNodes[0])
    expect(nodeA._childNodes.get('two')).to.eql(childNodes[1])
    expect(nodeA._childNodes.get('three')).to.eql(childNodes[2])

    const childNodes1 = nodeA.childNodes
    expect(childNodes1[0]).to.eql(childNodes[0])
    expect(childNodes1[1]).to.eql(childNodes[1])
    expect(childNodes1[2]).to.eql(childNodes[2])

    nodeA.scope.bar.push('four')
    const childNodes2 = nodeA.childNodes
    expect(childNodes2.length).to.eql(4)
    expect(Array.from(nodeA._childNodes.keys())).to.eql(
      ['one', 'two', 'three', 'four']
    )
  })
  it('handles reordering of keyed nodes', () => {
    const nodeA = new VForNode('msg of msgs')
    const nodeB = new Vnode('p')
    nodeB.key = sandbox(() => msg.id) // eslint-disable-line no-undef

    nodeA.childNodes = nodeB
    nodeA.scope = {msgs: [
      {id: 1, text: 'one'},
      {id: 2, text: 'two'},
      {id: 3, text: 'three'},
    ]}

    const childNodes = nodeA.childNodes
    expect(childNodes[0]._props.msg.text).to.eql('one')
    expect(childNodes[1]._props.msg.text).to.eql('two')
    expect(childNodes[2]._props.msg.text).to.eql('three')

    nodeA.scope = {msgs: [
      {id: 2, text: 'two'},
      {id: 1, text: 'one'},
      {id: 3, text: 'three'},
    ]}

    const childNodes1 = nodeA.childNodes
    expect(childNodes1[0]._props.msg.text).to.eql('two')
    expect(childNodes1[1]._props.msg.text).to.eql('one')
    expect(childNodes1[2]._props.msg.text).to.eql('three')

    expect(childNodes[0]).to.eql(childNodes1[1])
    expect(childNodes[1]).to.eql(childNodes1[0])
    expect(childNodes[2]).to.eql(childNodes1[2])
  })
})

describe('iota', () => {
  it('does simple interpolation', () => {
    // const cases = `
    //   <a href=\${linkto}>Foo</a>

    //   <p>\${msg}</p>

    //   <li i-for="m of msgs">\${m}</li>
    // `
    // const data = {
    //   linkto: 'https://url.com',
    //   msg: 'hello world',
    //   msgs: ['one', 'two', 'three'],
    // }
    // // const nodeA = 

    // // for i-for we want to create a template/blueprint and then we probably
    // // want to cache the instances. Any interpolations that happen inside of the
    // // looped el, we want to make sure they have access to all of the parent
    // // scope.

    // // We also want to propagate scope correctly.
    // // In the following, <p> should have access to `m` as you would expect.
    // //   <li i-for="m of msgs"><p>${m}</p></li>
    // // While the foo component does not have access to m
    // //   <div i-for="m of msgs"><foo /></div>
    // // Unless we explicitly pass it through...
    // //   <div i-for="m of msgs"><foo m="m"/></div>
  })
})
