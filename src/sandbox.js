export default function sandbox (fnOrString) {
  let src = null
  if (fnOrString instanceof Function)    src = `(${fnOrString.toString()})()`
  else if (fnOrString instanceof String) src = fnOrString
  else throw new Error('cannot create sandbox for: ', fnOrString)

  const fn = new Function('scope', `
    with (scope || {}) return ${src}
  `)
  return fn
}

