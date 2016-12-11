/* eslint-env mocha */
import {expect} from 'chai'

import {objGet, observe} from './util'

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
