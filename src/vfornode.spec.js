/* eslint-env mocha */
import {expect} from 'chai'
import VForNode from './vfornode'
import Vnode from './vnode'
import Tnode from './tnode'
import sandbox from './sandbox'

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

