import 'react'

declare module 'react' {
  // React 18's typings predate `inert`. The DOM attribute is what removes a
  // hidden-but-present subtree (closed drawers, collapsed side panels) from the
  // tab order — `opacity-0` and `w-0` do not.
  interface HTMLAttributes<T> {
    inert?: '' | undefined
  }
}
