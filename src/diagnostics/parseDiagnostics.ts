import type { Tree } from '@lezer/common'

import { parser } from '../language/spinasmParser'
import { getLineContext } from './context'
import type { ValidationDiagnostic } from './types'

interface LineColumn {
  line: number
  column: number
}

const getLineColumn = (source: string, position: number): LineColumn => {
  const prefix = source.slice(0, position)
  const lineMatches = prefix.match(/\r?\n/g)
  const line = (lineMatches?.length ?? 0) + 1
  const lastNewlineIndex = Math.max(prefix.lastIndexOf('\n'), prefix.lastIndexOf('\r'))
  const column = position - lastNewlineIndex

  return { line, column }
}

export const parseDiagnostics = (
  source: string,
  tree: Tree = parser.parse(source)
): ValidationDiagnostic[] => {
  const diagnostics: ValidationDiagnostic[] = []

  tree.iterate({
    enter: (node) => {
      if (!node.type.isError) {
        return
      }

      const { line, column } = getLineColumn(source, node.from)

      diagnostics.push({
        severity: 'error',
        message: 'Syntax error',
        line,
        column,
        context: getLineContext(source, line),
      })
    },
  })

  return diagnostics
}
