/* eslint-env mocha */
import {expect} from 'chai'
import Node from './node'

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
    it.only('can clone trees', () => {
      const [
        nodeA,
        nodeB,
        nodeC,
        nodeD,
        nodeE,
      ] = [
        new Node(),
        new Node(),
        new Node(),
        new Node(),
        new Node(),
      ]
      nodeA.addChild(nodeB)
      nodeB.addChild(nodeC)
      nodeB.addChild(nodeD)
      nodeA.addChild(nodeE)

      const cloned = nodeA.clone()
      expect(cloned).to.be.ok
      expect(cloned === nodeA).to.be.false
      expect(cloned.firstChild === nodeB).to.be.false
      expect(cloned.firstChild.firstChild).is.ok
      expect(cloned.firstChild.firstChild === nodeC).to.be.false
      expect(cloned.firstChild.firstChild.nextSibling).is.ok
      expect(cloned.firstChild.firstChild.nextSibling === nodeD).to.be.false
      expect(cloned.firstChild.nextSibling).is.ok
      expect(cloned.firstChild.nextSibling === nodeE).to.be.false
    })
    it('sub classes can be cloned', () => {
      class Foo extends Node {
        constructor (bar) {
          super(...arguments)
          this.bar = bar
        }
      }
      const nodeA = new Foo('one')
      expect(Array.from(nodeA.args)).to.eql(['one'])
      const nodeB = nodeA.clone()
      expect(nodeA === nodeB).to.eql(false)
      expect(nodeB.bar).to.eql('one')
    })
  })
})
