/* eslint-env mocha */
import {expect} from 'chai'
import sandbox from './sandbox'

describe('sandbox', () => {
  const fn = function () {
    return 'hello world'
  }
  it('initializes correctly', () => {
    const sandboxed = sandbox(fn)
    expect(sandboxed).to.be.ok
  })
  it('works correctly', () => {
    const sandboxed = sandbox(fn)
    expect(sandboxed()).to.eql('hello world')
  })
  it('works correctly with scope', () => {
    const fn = function () {
      // eslint-disable-next-line no-undef
      return msg
    }
    const scope = {msg: 'hello world'}
    const sandboxed = sandbox(fn)
    expect(sandboxed(scope)).to.eql('hello world')
    scope.msg = 'hello again world'
    expect(sandboxed(scope)).to.eql('hello again world')
  })
})

