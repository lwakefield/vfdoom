/* eslint-env mocha */
import {expect} from 'chai'

import {
  objGet,
  observe,
  proxy,
  isTNode,
  isVNode,
  isComponent,
  isFunctionalNode,
  isIota,
} from './util'

import {
  Vnode,
  Tnode,
  Component,
  Iota,
  VFunctionalNode,
} from './nodes'

describe('objGet', () => {
  it('works correctly', () => {
    expect(objGet({foo: 'one'}, 'foo')).to.eql('one')
    expect(objGet({foo: {bar: 'two'}}, 'foo.bar')).to.eql('two')
    expect(objGet({foo: {bar: {baz: 'three'}}}, 'foo.bar.baz')).to.eql('three')
    expect(objGet({foo: {bar: {baz: 'three'}}}, 'foo.boo.baz')).to.eql(null)
  })
})

describe('observe', () => {
  it('Notifies of changes', done => {
    let data = {
      foo: { bar: { baz: 'hello' } },
    }
    data = observe(data, done)
    data.foo.bar.baz = 'world'
  })

  it('Refreshes observe if you set prop to an obj', () => {
    let data = { foo: { bar: 'hello' } }
    let set = 0
    data = observe(data, () => set++)

    data.foo = { bar: 'world' }
    expect(set).to.be.eql(1)
    data.foo.bar = 'hello'
    expect(set).to.be.eql(2)
  })
})

describe('proxy', () => {
  it('correctly proxies properties', () => {
    let data = {
      foo: { bar: { baz: 'hello' } },
      qux: 'world',
    }
    let obj = {}
    proxy(obj, data)
    expect(obj.foo).to.eql(data.foo)
    expect(obj.qux).to.eql(data.qux)

    data.foo.bar.baz = 'world'
    expect(obj.foo).to.eql(data.foo)

    obj.foo.bar.baz = 'hello'
    expect(data.foo.bar.baz).to.eql('hello')
  })
})

describe('identifies types', () => {
  it('isTNode works correctly', () => {
    expect(isTNode(new Tnode())).to.be.true
  })
  it('isVNode works correctly', () => {
    expect(isVNode(new Vnode())).to.be.true
  })
  it('isFunctionalNode works correctly', () => {
    expect(isFunctionalNode(new VFunctionalNode())).to.be.true
  })
  it('isComponent works correctly', () => {
    expect(isComponent(new Component())).to.be.true
    expect(isComponent(new Iota())).to.be.true
  })
  it('isIota works correctly', () => {
    expect(isIota(new Iota())).to.be.true
  })
})
