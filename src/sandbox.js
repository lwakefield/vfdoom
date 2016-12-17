export default function sandbox (fnOrString) {
  let src = null
  let args = []
  if (fnOrString instanceof Function) {
    const fn = fnOrString
    args = fn.toString().match(/function\s.*?\(([^)]*)\)/)[1]
      .split(',')
      .map(v => v.replace(/\/\*.*\*\//, '').trim())
      .filter(v => v)
    src = `(${fn.toString()})(${args.join(', ')})`
  } else if (fnOrString instanceof String) {
    src = fnOrString
  } else {
    throw new Error('cannot create sandbox for: ', fnOrString)
  }

  const fn = new Function('scope', ...args, `
    with (scope || {}) return ${src}
  `)
  return fn
}
