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

describe('EventListener', () => {
  it('initializes correctly', () => {
    expect(new EventListener('click', () => {})).to.be.ok
  })
  it('attaches correctly', () => {
    const e = new EventListener('click', () => {})
    const node = document.createElement('button')
    e.attachTo(node)
  })
  it('handles event correctly', () => {
    const e = new EventListener('click', function ($event) {
      this.calls.push(arguments)
    })
    const parentNode = {scope: {calls: []}}
    e.parentNode = parentNode

    const node = document.createElement('button')
    e.attachTo(node)

    node.dispatchEvent(new Event('click'))
    expect(parentNode.scope.calls.length).to.eql(1)
  })
  it('detaches correctly', () => {
    const e = new EventListener('click', function ($event) {
      this.calls.push(arguments)
    })
    const parentNode = {scope: {calls: []}}
    e.parentNode = parentNode

    const node = document.createElement('button')
    e.attachTo(node)

    node.dispatchEvent(new Event('click'))
    e.detachFrom(node)
    node.dispatchEvent(new Event('click'))
    expect(parentNode.scope.calls.length).to.eql(1)
  })
  it.skip('handles events when attached to two nodes correctly', () => {
  })
})


