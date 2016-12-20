/* eslint-env mocha */
import jsdom from 'jsdom'
import {expect} from 'chai'

import Compiler from './Compiler'

beforeEach(() => {
  const window = jsdom.jsdom().defaultView
  const document = window.document
  global['window'] = window
  global['document'] = document
  global['Text'] = window.Text
})

describe('Compiler', () => {
  it('Compiles a single node', () => {
    const el = document.createElement('div')
    const c = new Compiler(el)
    c.next()
    expect(c.isDone()).to.be.true
    expect(c.result.type).to.eql('Component')
  })
  it('Compiles a tree of nodes', () => {
    const el = document.createElement('div')
    el.innerHTML = `
      <h1> Hello world </h1>
      <ul>
        <li> One </li>
        <li> Two </li>
        <li> Three </li>
      </ul>
    `
    const c = new Compiler(el)
    while (!c.isDone()) c.next()

    expect(c.isDone()).to.be.true
    const result = c.result
    expect(result.type).to.eql('Component')
    expect(result._childNodes.length).to.eql(5)

    const [t_0, h1_0, t_1, ul_0, t_2] = result._childNodes
    expect(t_0.type).to.eql('Tnode')
    expect(h1_0.type).to.eql('Vnode')
    expect(t_1.type).to.eql('Tnode')
    expect(ul_0.type).to.eql('Vnode')
    expect(t_2.type).to.eql('Tnode')

    expect(h1_0.tagName).to.eql('h1')
    expect(ul_0.tagName).to.eql('ul')

    const [t_3] = h1_0._childNodes
    expect(t_3.type).to.eql('Tnode')
    expect(t_3._text).to.eql(' Hello world ')

    const [t_4, li_0, t_5, li_1, t_6, li_2, t_7] = ul_0._childNodes
    expect(t_4.type).to.eql('Tnode')
    expect(li_0.type).to.eql('Vnode')
    expect(t_5.type).to.eql('Tnode')
    expect(li_1.type).to.eql('Vnode')
    expect(t_6.type).to.eql('Tnode')
    expect(li_2.type).to.eql('Vnode')
    expect(t_7.type).to.eql('Tnode')

    expect(li_0.tagName).to.eql('li')
    expect(li_1.tagName).to.eql('li')
    expect(li_2.tagName).to.eql('li')

    const [t_8] = li_0._childNodes
    expect(t_8.type).to.eql('Tnode')
    expect(t_8._text).to.eql(' One ')
    const [t_9] = li_1._childNodes
    expect(t_9.type).to.eql('Tnode')
    expect(t_9._text).to.eql(' Two ')
    const [t_10] = li_2._childNodes
    expect(t_10.type).to.eql('Tnode')
    expect(t_10._text).to.eql(' Three ')
  })
  it('Adds a static attribute to a node', () => {
    const el = document.createElement('div')
    el.setAttribute('class', 'foo')
    const c = new Compiler(el)
    while (!c.isDone()) c.next()

    expect(c.result.type).to.eql('Component')
    expect(c.result._childNodes.length).to.eql(0)
    expect(c.result.attributes.length).to.eql(1)
    const attr = c.result.attributes[0]
    expect(attr.name).to.eql('class')
    expect(attr.value).to.eql('foo')
  })
  it('Adds an interpolated attribute to a node', () => {
    const el = document.createElement('div')
    el.setAttribute('class', 'foo ${bar}')
    const c = new Compiler(el)
    while (!c.isDone()) c.next()

    expect(c.result.type).to.eql('Component')
    expect(c.result._childNodes.length).to.eql(0)
    expect(c.result.attributes.length).to.eql(1)
    const attr = c.result.attributes[0]
    expect(attr.name).to.eql('class')

    c.result.scope = {bar: 'hello'}
    expect(attr.value).to.eql('foo hello')
  })
  it('Adds a bound attribute to a node', () => {
    const el = document.createElement('div')
    el.setAttribute(':class', 'className')
    const c = new Compiler(el)
    while (!c.isDone()) c.next()

    expect(c.result.type).to.eql('Component')
    expect(c.result._childNodes.length).to.eql(0)
    expect(c.result.attributes.length).to.eql(1)
    const attr = c.result.attributes[0]
    expect(attr.name).to.eql('class')
    c.result.scope = {className: 'foo bar'}
    expect(attr.value).to.eql('foo bar')
  })
})

