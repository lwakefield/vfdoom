/* eslint-env mocha */
import {expect} from 'chai'
import VFunctionalNode from './VFunctionalNode'
import Vnode from './vnode'
import Tnode from './tnode'
import sandbox from './sandbox'

describe('VFunctionalNode', () => {
  it('instantiates correctly', () => {
    const node = new VFunctionalNode(() => {})
    expect(node).is.ok
  })
  it('sets blueprint correctly', () => {
    const nodeA = new VFunctionalNode('foo of bar')
    const nodeB = new Vnode('p')

    nodeA.addChild(nodeB)

    expect(nodeA._blueprint).is.ok
  })
  it('creates children correctly as a for', () => {
    const nodeA = new VFunctionalNode(
      // eslint-disable-next-line no-undef
      sandbox(() => msgs.map(m => ({m})))
    )
    const nodeB = new Vnode('p')

    nodeA.addChild(nodeB)
    nodeA.scope = {msgs: ['one', 'two', 'three']}

    const childNodes = nodeA.childNodes
    expect(childNodes[0]._props).to.eql({m: 'one', $index: 0})
    expect(childNodes[1]._props).to.eql({m: 'two', $index: 1})
    expect(childNodes[2]._props).to.eql({m: 'three', $index: 2})

    expect(nodeA.mountedNodes.get(0)).to.eql(childNodes[0])
    expect(nodeA.mountedNodes.get(1)).to.eql(childNodes[1])
    expect(nodeA.mountedNodes.get(2)).to.eql(childNodes[2])

    const childNodes1 = nodeA.childNodes
    expect(childNodes1[0]).to.eql(childNodes[0])
    expect(childNodes1[1]).to.eql(childNodes[1])
    expect(childNodes1[2]).to.eql(childNodes[2])
  })
  it('creates children correctly as an if', () => {
    const nodeA = new VFunctionalNode(
      // eslint-disable-next-line no-undef
      sandbox(() => show ? [{}] : [])
    )
    const nodeB = new Vnode('p')

    nodeA.addChild(nodeB)
    nodeA.scope = {show: true}

    const childNodes = nodeA.childNodes
    expect(childNodes[0]).is.ok

    nodeA.scope = {show: false}
    const childNodes1 = nodeA.childNodes
    expect(childNodes1[0]).is.not.ok
  })
  it('creates children correctly as an for with a nested if', () => {
    const nodeA = new VFunctionalNode(
      /* eslint-disable no-undef */
      sandbox(() => ({msgs: msgs.filter(m => m.show)})),
      sandbox(() => msgs.map(m => ({m})))
      /* eslint-enable no-undef */
    )
    const nodeB = new Vnode('p')
    nodeA.addChild(nodeB)

    nodeA.scope = {
      msgs: [
        {show: true, text: 'one'},
        {show: false, text: 'two'},
        {show: true, text: 'three'},
      ],
    }
    const childNodes = nodeA.childNodes
    expect(childNodes.length).to.eql(2)
    expect(childNodes[0]._props).to.eql(
      {$index: 0, m: {show: true, text: 'one'}}
    )
    expect(childNodes[1]._props).to.eql(
      {$index: 1, m: {show: true, text: 'three'}}
    )

    nodeA.scope = {
      msgs: [
        {show: true, text: 'one'},
        {show: true, text: 'two'},
        {show: false, text: 'three'},
      ],
    }
    const childNodes1 = nodeA.childNodes
    expect(childNodes1.length).to.eql(2)
    expect(childNodes1[0]._props).to.eql(
      {$index: 0, m: {show: true, text: 'one'}}
    )
    expect(childNodes1[1]._props).to.eql(
      {$index: 1, m: {show: true, text: 'two'}}
    )

    nodeA.scope = {
      msgs: [
        {show: false, text: 'one'},
        {show: false, text: 'two'},
        {show: false, text: 'three'},
      ],
    }
    const childNodes2 = nodeA.childNodes
    expect(childNodes2.length).to.eql(0)
  })
})
