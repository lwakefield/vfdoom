/* eslint-env mocha */
/* global Event */
import {expect} from 'chai'
import jsdom from 'jsdom'

import EventListener from './EventListener'
import sandbox from './sandbox'

beforeEach(() => {
  const window = jsdom.jsdom().defaultView
  const document = window.document
  global['window'] = window
  global['document'] = document
  global['Text'] = window.Text
  global['Event'] = window.Event
})

describe.only('EventListener', () => {
  it('initializes correctly', () => {
    expect(new EventListener('click', () => {})).to.be.ok
  })
  it('attaches correctly', () => {
    const e = new EventListener('click', () => {})
    const node = document.createElement('button')
    e.attachTo(node)
  })
  it('handles event correctly', () => {
    let callCount = 0
    const e = new EventListener('click', () => callCount++)
    const node = document.createElement('button')
    e.attachTo(node)
    node.dispatchEvent(new Event('click'))
    expect(callCount).to.eql(1)
  })
  it('detaches correctly', () => {
    let callCount = 0
    const e = new EventListener('click', () => callCount++)
    const node = document.createElement('button')
    e.attachTo(node)
    node.dispatchEvent(new Event('click'))
    e.detachFrom(node)
    node.dispatchEvent(new Event('click'))
    expect(callCount).to.eql(1)
  })
  it('handles events when attached to two nodes correctly', () => {
    let callCount = 0
    const e = new EventListener('click', () => callCount++)
    const [nodeA, nodeB] = [
      document.createElement('button'),
      document.createElement('button'),
    ]
    e.attachTo(nodeA)
    e.attachTo(nodeB)
    nodeA.dispatchEvent(new Event('click'))
    nodeB.dispatchEvent(new Event('click'))
    e.detachFrom(nodeB)
    nodeA.dispatchEvent(new Event('click'))
    nodeB.dispatchEvent(new Event('click'))
    expect(callCount).to.eql(3)
  })
})


