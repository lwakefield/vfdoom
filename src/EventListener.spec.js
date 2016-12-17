/* eslint-env mocha */
/* global Event */
import {expect} from 'chai'
import jsdom from 'jsdom'

import EventListener from './EventListener'

beforeEach(() => {
  const window = jsdom.jsdom().defaultView
  const document = window.document
  global['window'] = window
  global['document'] = document
  global['Text'] = window.Text
  global['Event'] = window.Event
})

/**
 * Our EventListener system is starting to get more specialized...
 * We want to aim for something like this.
 *
 * <button @click="doSomething($event, foo, bar)" />
 * {
 *   data: {
 *     myVal: 1
 *   },
 *   methods: {
 *     doSomething ($event, foo, bar) {
 *       // We expect to have full access to the scope from data and methods.
 *       // We expect this to resolve to data.myVal
 *       this.myVal++
 *
 *       // Ideally we want to avoid something like this
 *       foo.val = 'that'
 *     }
 *   }
 * }
 *
 * Our handler will do something like this:
 *
 * node.addEventListener('click', function ($event) {
 *   handler.call(this.scope, $event, foo, bar);
 * })
 *
 */

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
    // Should this ever happen?
  })
})


