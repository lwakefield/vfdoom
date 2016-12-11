/* eslint-env mocha */
import {expect} from 'chai'
import Tnode from './tnode'
import Node from './node'
import sandbox from './sandbox'

describe('Tnode', () => {
  it('instantiates', () => {
    expect(new Tnode()).to.be.ok
  })
  it('has static text', () => {
    const tnode = new Tnode('lorem ipsum')
    expect(tnode.text).to.eql('lorem ipsum')
  })
  it('has functional text', () => {
    const tnode = new Tnode(() => 'lorem ipsum')
    expect(tnode.text).to.eql('lorem ipsum')
  })
  it('has functional text with scope', () => {
    // eslint-disable-next-line no-undef
    const tnode = new Tnode(sandbox(() => m))
    tnode.scope = {m: 'lorem ipsum'}
    expect(tnode.text).to.eql('lorem ipsum')
  })
  it('inherits scope from parent', () => {
    const parent = new Node()
    parent.scope = {m: 'lorem ipsum'}
    // eslint-disable-next-line no-undef
    const tnode = new Tnode(sandbox(() => m))
    parent.addChild(tnode)
    expect(tnode.text).to.eql('lorem ipsum')
  })
})

