/* eslint-env mocha */
import {expect} from 'chai'
import {
  Node,
  Vnode,
  Vfnode,
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
    if (!node.parent) return node
  }
}

describe('Node', () => {
  it('adds a single child', () => {
    const nodeA = new Node()
    const nodeB = new Node()
    nodeA.addChild(nodeB)

    expect(nodeA.firstChild).to.eql(nodeB)
    expect(nodeA.children[0]).to.eql(nodeB)
    expect(nodeB.parent).to.eql(nodeA)
  })

  it('adds two children', () => {
    const nodeA = new Node()
    const nodeB = new Node()
    const nodeC = new Node()
    nodeA.addChild(nodeB)
    nodeA.addChild(nodeC)

    expect(nodeA.firstChild).to.eql(nodeB)
    expect(nodeA.children[0]).to.eql(nodeB)
    expect(nodeB.parent).to.eql(nodeA)

    expect(nodeA.firstChild.nextSibling).to.eql(nodeC)
    expect(nodeA.children[1]).to.eql(nodeC)
    expect(nodeB.nextSibling).to.eql(nodeC)
    expect(nodeC.parent).to.eql(nodeA)
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
  const fn = () => {
    return new Array(5).map(v => new Vnode('div') )
  }
  it ('instantiates', () => {
    const vfnode = new Vfnode(fn)

    expect(vfnode).to.be.ok
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
    expect(nodeB.parent).to.eql(nodeA)

    const nodeC = nodeB.firstChild
    expect(nodeC).to.be.ok
    expect(nodeC).to.be.instanceof(Node)
    expect(nodeC.parent).to.eql(nodeB)

    const nodeD = nodeA.children[1]
    expect(nodeD).to.be.ok
    expect(nodeD).to.be.instanceof(Node)
    expect(nodeD.parent).to.eql(nodeA)
    expect(nodeB.nextSibling).to.eql(nodeD)
    expect(nodeD.prevSibling).to.eql(nodeB)
  })
})

describe('Patcher', () => {
  //     A
  //    / \
  //   B   D
  //  /
  // C
  const nodeA = treeFromStr(`
    A - B
    A - D
    B - C
  `)
  it('iterates correctly', () => {
    const patcher = new Patcher(nodeA, nodeA)
    const nodeB = nodeA.firstChild
    const nodeC = nodeB.firstChild
    const nodeD = nodeA.firstChild.nextSibling

    expect(patcher.mountPoint).to.eql(0)
    expect(patcher.nodeB).to.eql(nodeA)

    expect(patcher.next()).to.be.ok
    expect(patcher.nodeB).to.eql(nodeB)
    expect(patcher.mountPoint).to.eql(1)

    expect(patcher.next()).to.be.ok
    expect(patcher.nodeB).to.eql(nodeC)
    expect(patcher.mountPoint).to.eql(2)

    expect(patcher.next()).to.be.ok
    expect(patcher.nodeB).to.eql(nodeD)
    expect(patcher.mountPoint).to.eql(3)

    expect(patcher.next()).to.not.be.ok
  })
})
