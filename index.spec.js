/* eslint-env mocha */
import {expect} from 'chai'
import jsdom from 'jsdom'

import {
  Node,
  Vnode,
  Vfnode,
  Component,
  Patcher,
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
    nodes.set(nodeName, new Node())
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

describe('Node', () => {
  it('adds a single child', () => {
    const nodeA = new Node()
    const nodeB = new Node()
    nodeA.addChild(nodeB)

    expect(nodeA.firstChild).to.eql(nodeB)
    expect(nodeA.children[0]).to.eql(nodeB)
    expect(nodeB.parentNode).to.eql(nodeA)
  })

  it('adds two children', () => {
    const nodeA = new Node()
    const nodeB = new Node()
    const nodeC = new Node()
    nodeA.addChild(nodeB)
    nodeA.addChild(nodeC)

    expect(nodeA.firstChild).to.eql(nodeB)
    expect(nodeA.children[0]).to.eql(nodeB)
    expect(nodeB.parentNode).to.eql(nodeA)

    expect(nodeA.firstChild.nextSibling).to.eql(nodeC)
    expect(nodeA.children[1]).to.eql(nodeC)
    expect(nodeB.nextSibling).to.eql(nodeC)
    expect(nodeC.parentNode).to.eql(nodeA)
    expect(nodeC.prevSibling).to.eql(nodeB)
  })
})

describe('Vnode', () => {
  it('instatiates', () => {
    const vnode = new Vnode('div')

    expect(vnode).to.be.ok
    expect(vnode.tagName).to.eql('div')
  })
})

describe('Vfnode', () => {
  const fn = () => [
    new Vnode(),
    new Vnode(),
    new Vnode(),
  ]
  it('instantiates', () => {
    const vfnode = new Vfnode(fn)
    expect(vfnode).to.be.ok
  })
  it('has children', () => {
    const vfnode = new Vfnode(fn)
    const children = vfnode.children
    expect(children).to.be.ok
    expect(children[0]).to.be.ok
    expect(children[1]).to.be.ok
    expect(children[2]).to.be.ok

    expect(children[0].prevSibling).to.eql(null)
    expect(children[0].nextSibling).to.eql(children[1])
    expect(children[1].prevSibling).to.eql(children[0])
    expect(children[1].nextSibling).to.eql(children[2])
    expect(children[2].prevSibling).to.eql(children[1])
    expect(children[2].nextSibling).to.eql(null)
  })
  it('inherits from parents and siblings', () => {
    const root = new Vnode()
    const vfnode = new Vfnode(fn)
    const left = new Vnode()
    const right = new Vnode()

    root.addChild(left)
    root.addChild(vfnode)
    root.addChild(right)

    const children = vfnode.children
    expect(children).to.be.ok
    expect(children[0]).to.be.ok
    expect(children[1]).to.be.ok
    expect(children[2]).to.be.ok

    expect(children[0].parentNode).to.eql(root)
    expect(children[1].parentNode).to.eql(root)
    expect(children[2].parentNode).to.eql(root)

    expect(children[0].prevSibling).to.eql(left)
    expect(children[0].nextSibling).to.eql(children[1])
    expect(children[1].prevSibling).to.eql(children[0])
    expect(children[1].nextSibling).to.eql(children[2])
    expect(children[2].prevSibling).to.eql(children[1])
    expect(children[2].nextSibling).to.eql(right)
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

    const nodeD = nodeA.children[1]
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
  })
  it('iterates correctly', () => {
    //     A
    //    / \
    //   B   E
    //  / \
    // C   D
    const nodeA = treeFromStr(`
      A - B
      B - C
      B - D
      A - E
    `)
    const nodeB = nodeA.firstChild
    const nodeC = nodeB.firstChild
    const nodeD = nodeC.nextSibling
    const nodeE = nodeB.nextSibling

    const patcher = new Patcher(nodeA, nodeA)

    expect(patcher.nodeB).to.eql(nodeA)

    expect(patcher.next()).to.be.ok
    expect(patcher.nodeB).to.eql(nodeB)

    expect(patcher.next()).to.be.ok
    expect(patcher.nodeB).to.eql(nodeC)

    expect(patcher.next()).to.be.ok
    expect(patcher.nodeB).to.eql(nodeD)

    expect(patcher.next()).to.be.ok
    expect(patcher.nodeB).to.eql(nodeE)

    expect(patcher.next()).to.not.be.ok
  })
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
    nodeA.mountPoint = 0
    nodeB.mountPoint = 1
    nodeC.mountPoint = 2
    nodeD.mountPoint = 3
    nodeE.mountPoint = 4
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
