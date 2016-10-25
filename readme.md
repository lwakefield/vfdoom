# VFDOM

This document is to lay the foundation for building VFDOM.

A Virtual DOM (VDOM) is a nested object structure which can be use to produce a
live DOM. We use a VDOM because it is much faster and easier to operate with
than the live DOM.

A VDOM will always produce the same DOM.

It is important to establish a terminology to distinguish between different
components of our system.

- The VFDOM is the encapsulating concept that we are specifying.
- A VFDOM contains vfnodes and vnodes
- A VDOM only contains vnodes
- A VFDOM can be built into a VDOM
- A VDOM can be built into a VDOM
- A VDOM always builds into the same DOM (by equality not necessarily reference)
- Given the above, we can build a VFDOM into a DOM. We call this `compiling`
- A VFDOM must have a root vfnode or vnode
- A VDOM must have a root vnode
- A vnode has a `tagname`, `attributes` and `eventlisteners`
- Each vnode may have `children`
- Each child in a vnodes `children` must be either a vnode or a primitive type.
    - A primitive type is a leaf node, which can be built into a TextNode
- A vnode can be built into a (DOM) node.
- A vfnode is a function.
- A vfnode must return either null, a single vnode or an array of vnodes

Despite the above, the data structure for a VDOM/VFDOM and vnode/vfnode are
almost identical. The largest difference is that a VFDOM sometime contains
functions (vfnodes) as children.

# Patching

The VFDOM and VDOM are concepts, by themselves they do nothing.

Image we compile a VFDOM into DOM _a_, then some moments later we compile the
same VFDOM into DOM _b_. _a_ and _b_ are expected to be somewhat similar, such
that we can apply the differences from _b_ to _a_ as a `patch`. We wish to
perform this `patch` such that we don't make any unnecessary updates and do not
unnecessarily create any new DOM nodes, or delete any DOM nodes that we can
reuse.

## Squeezing performance

We don't want to compare DOM _a_ to DOM _b_, because DOM operations can be slow.
Instead we will build the VFDOM into VDOM _vb_, so that we compare _vb_ to _a_.
We could compare _va_ to _vb_, but this assumes _a_ has not changed since last
patch (think about other plugins that may operate on _a_ in between patches).

The key to patching is to track DOM elements and vnodes. We wish for every vnode
to have a key. We then want to have a pool of nodes, mapped by the keys for
quick lookup when patching. When patching, we can check whether we have a keyed
node in our pool.

We can further optimize the above, if we know that a certain node and its
children will never change ie. it is `static`. That way when patching, we don't
need to continue traversing its children.

We need a way to reliably generate keys for a vnodes and vfnodes in a VFDOM.

# Examples

Before we continue, I think this is a good time to look at some examples. We
will omit eventlisteners, the hard part lies in the patching...

Here is some relatively simple HTML.

```html
<header class="header">
    <h1>todos</h1>
    <input class="new-todo" placeholder="What needs to be done?">
</header>
```

Here is the VDOM for the above HTML:

```javascript
{tagname: 'header', attributes: {class: 'header'}, children: [
    {tagname: 'h1', attributes: {}, children: ['todos']},
    {tagname: 'input', attributes: {class: 'new-todo', placeholder: 'What needs to be done'} children: []}
]}
```

It should be relatively straight forward to identify the mapping between the
two. In fact, the mapping between the two is completely isomorphic.

Here is a VFDOM:

```javascript
{tagname: 'div', attributes: {id: 'my-app'}, children: [
    tagname: 'h1', attributes: {class: 'heading'}, children: ['Todo list'],
    tagname: 'ul', attributes: {}, children: [
        function () {
            return todos.map(v => (
                {tagname: 'li', attributes: {}, children: [v.title]}
            ))
        },
        function () {
            return todos.length == 0
                ? {tagname: 'li', attributes: {}, children: ['nothing to do...']}
                : null
        }
    ],
]}
```

Note that there are functions as children of the `ul` vnode. To be able to
evaluate this VFDOM, we will require that a `todos` variable is in scope.

If the `todos` variable is in scope as follows:

```javascript
todos = [
    {text: 'one thing'},
    {text: 'two thing'},
    {text: 'three thing'},
    {text: 'more'},
]
```

Then we would expect the compilation of the VFDOM into a DOM to produce the
following:

```html
<div id="my-app">
    <h1 class="heading">Todo list</h1>
    <ul>
        <li>one thing</li>
        <li>two thing</li>
        <li>three thing</li>
        <li>more</li>
    </ul>
</div>
```

Or if `todos` is in scope as follows:

```javascript
todos = []
```

Then we would expect the compilation of the VFDOM into a DOM to produce the
following:

```html
<div id="my-app">
    <h1 class="heading">Todo list</h1>
    <ul>
        <li>nothing to do...</li>
    </ul>
</div>
```

# How to track nodes

Given the above example, lets further examine some cases, which hopefully will
give some insight as to how to allocate keys to track nodes.

## Mount point

__vv maybe unnecessary vv__

Let's introduce the concept of a mount point. By definition, a vfnode can return
an arbitrary vnode. If we simplify this, then we can make tracking significantly
easier.

Let us state that a vfnode can return none, one or many vnodes _of the same
type_.

__^^ maybe unnecessary ^^__

Let us first restate that a vfnode can return none, one or many vnodes.  We can
now focus on the fact that the result is expected to be inserted into the dom at
a specific location relative to the rest of the vdom. We will call this specific
locatoin the `mount point`.

## Replace all

Given patch _a_ with:

```javascript
todos = [
    {text: 'one thing'},
    {text: 'two thing'},
    {text: 'three thing'},
]
```

Then patch _b_ with:

```javascript
todos = [
    {text: 'four thing'},
    {text: 'five thing'},
    {text: 'six thing'},
]
```

If we apply _a_, then _b_ to some node, then we expect no nodes to be reused.
Every item in patch _b_ will be instantiated and items from patch _a_ will be
removed from the node. We don't really care about keying or tracking elements
with this case.

## Swapping order

Assuming we have patch _c_:

```javascript
todos = [
    {text: 'two thing'},
    {text: 'three thing'},
    {text: 'one thing'},
]
```

We don't wish to create new nodes, because they exist already. We simply wish to
rearrange the nodes. We need a way to identify which vnode maps to which node.
I believe the best way to achieve this is with explicit keying. This means that
the programmer is responsible for choosing keys for the vnode.

Let's alter our VFDOM from above (we are only interested in the functions).

```javascript
    [
        function () {
            return todos.map(v => (
                {tagname: 'li', key: v.id, attributes: {}, children: [v.title]}
            ))
        },
        function () {
            return todos.length == 0
                ? {tagname: 'li', key: -1, attributes: {}, children: ['nothing to do...']}
                : null
        }
    ]
```

As a result, our `todos` var will now require an id.

We now need to consider how we will be storing our references. Consider that we
are rendering two lists based on two different arrays, but elements in array _a_
may have the same key as an element in array _b_.

This is where our model begins to become more complex.

<!-- Let us add a new concept to our VFDOM. Each vnode and vfnode must know its -->
<!-- location in the VFDOM tree. -->

<!-- Let us add a new idea to our VFDOM. When patching, we must know where we are -->
<!-- inside of the tree. Conceptually, we can think of a tree as being read from top -->
<!-- down and left to right. This is something that we can determine at patch time by -->
<!-- tracking the y and x of the position in the tree. -->

<!-- Everytime we visit a child, increment y. -->


<!--
The above VDOM in its true form can be hard to read (and write). Although I
hesitate, I believe it will be easier if I introduce a notation for the above.

```
header (class:'header')
  h1
    'todos'
  input (class:'new-todo', placeholder='What needs to be done')
```

Hopefully by the character count alone (110 -> 220 -> 96) it is apparent why I
chose to introduce this notation.
-->

