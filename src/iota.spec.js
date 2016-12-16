/* eslint-env mocha */
import {expect} from 'chai'
import jsdom from 'jsdom'

import Iota from './iota'
import Vnode from './Vnode'
import Tnode from './tnode'
import sandbox from './sandbox'

beforeEach(() => {
  const window = jsdom.jsdom().defaultView
  const document = window.document
  global['window'] = window
  global['document'] = document
  global['Text'] = window.Text
})

describe('iota', () => {
  it('builds a simple app', () => {
    const el = document.createElement('div')
    const iota = new Iota(el)

    // const nodeB = new VForNode('msg in msgs')
    // const nodeC = new Vnode('p')
    // // eslint-disable-next-line no-undef
    // const nodeD = new Tnode(sandbox(() => `${$index} - ${msg}`))
    // iota.addChild(nodeB)
    // nodeB.addChild(nodeC)
    // nodeC.addChild(nodeD)

    // iota.$data.msgs = ['one', 'two', 'three']
    // expect(el.outerHTML).to.eql(
    //   '<div><p>0 - one</p><p>1 - two</p><p>2 - three</p></div>'
    // )

    // iota.$data.msgs = ['three', 'one', 'two']
    // expect(el.outerHTML).to.eql(
    //   '<div><p>0 - three</p><p>1 - one</p><p>2 - two</p></div>'
    // )
  })
})

