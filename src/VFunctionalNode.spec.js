/* eslint-env mocha */
/* globals Event */
import {expect} from 'chai'
import VFunctionalNode from './VFunctionalNode'
import Vnode from './vnode'
import Tnode from './tnode'
import sandbox from './sandbox'
import VAttribute from './vattribute'
import EventListener from './EventListener'

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
  it('handles attributes correctly as a for', () => {
    const nodeA = new VFunctionalNode(
      // eslint-disable-next-line no-undef
      sandbox(() => msgs.map(m => ({m})))
    )
    const nodeB = new Vnode('p')
    const attr = new VAttribute(
      'class',
      // eslint-disable-next-line no-undef
      sandbox(() => `msg-${m.id}`),
    )
    nodeB.addAttribute(attr)

    nodeA.addChild(nodeB)
    nodeA.scope = {msgs: [
      {id: 1},
      {id: 2},
      {id: 3},
    ]}

    const [child1, child2, child3] = nodeA.childNodes
    expect(child1.attributes[0].name).to.eql('class')
    expect(child1.attributes[0].value).to.eql('msg-1')
    expect(child2.attributes[0].name).to.eql('class')
    expect(child2.attributes[0].value).to.eql('msg-2')
    expect(child3.attributes[0].name).to.eql('class')
    expect(child3.attributes[0].value).to.eql('msg-3')
  })
  it('handles eventListeners correctly as a for', () => {
    const root = new Vnode()
    const nodeA = new VFunctionalNode(
      // eslint-disable-next-line no-undef
      sandbox(() => msgs.map(m => ({m})))
    )

    const nodeB = new Vnode('p')
    const listener = new EventListener('click', $event => {
      // eslint-disable-next-line no-undef
      calls.push($event)
    })
    nodeB.addEventListener(listener)

    root.addChild(nodeA)
    nodeA.addChild(nodeB)
    root.scope = {msgs: ['one', 'two', 'three'], calls: []}

    const [listenerA, listenerB, listenerC] = nodeA.childNodes
      .map(v => v.eventListeners[0])
    const [dnodeA, dnodeB, dnodeC] = [
      document.createElement('button'),
      document.createElement('button'),
      document.createElement('button'),
    ]
    listenerA.attachTo(dnodeA)
    listenerB.attachTo(dnodeB)
    listenerC.attachTo(dnodeC)

    dnodeA.dispatchEvent(new Event('click'))
    expect(nodeA.scope.calls.length).to.eql(1)
    dnodeB.dispatchEvent(new Event('click'))
    expect(nodeA.scope.calls.length).to.eql(2)
    dnodeC.dispatchEvent(new Event('click'))
    expect(nodeA.scope.calls.length).to.eql(3)
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
      sandbox(() => msgs.reduce((result, m) => {
        if (m.show) result.push({m})
        return result
      }, []))
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
