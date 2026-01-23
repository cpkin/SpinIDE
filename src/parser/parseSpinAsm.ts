import type { ParseResult, ParsedInstruction, SymbolTables } from './ast'
import { opcodeSet } from './opcodes'
import { parseDiagnostics } from '../diagnostics/parseDiagnostics'

const directiveSet = new Set(['equ', 'mem', 'org'])

const createSymbolTables = (): SymbolTables => ({
  labels: {},
  equates: {},
  memory: {},
})

const stripComment = (line: string): string => {
  const commentIndex = line.indexOf(';')
  return commentIndex === -1 ? line : line.slice(0, commentIndex)
}

export const parseSpinAsm = (source: string): ParseResult => {
  const instructions: ParsedInstruction[] = []
  const symbols = createSymbolTables()
  const diagnostics = parseDiagnostics(source)

  const lines = source.split(/\r?\n/)

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const content = stripComment(line)

    if (!content.trim()) {
      return
    }

    let remainder = content
    const labelMatch = remainder.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*/)

    if (labelMatch) {
      const labelName = labelMatch[1]
      const labelIndex = content.indexOf(labelName)
      symbols.labels[labelName.toLowerCase()] = {
        name: labelName,
        line: lineNumber,
        column: labelIndex + 1,
      }
      remainder = remainder.slice(labelMatch[0].length)
    }

    const trimmed = remainder.trim()
    if (!trimmed) {
      return
    }

    const keywordMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\b/)
    if (!keywordMatch) {
      return
    }

    const keyword = keywordMatch[1]
    const normalizedKeyword = keyword.toLowerCase()
    const keywordColumn = content.indexOf(keyword) + 1
    const afterKeyword = trimmed.slice(keywordMatch[0].length).trim()

    if (directiveSet.has(normalizedKeyword)) {
      if (normalizedKeyword === 'equ' || normalizedKeyword === 'mem') {
        const labelToken = afterKeyword.match(/^([A-Za-z_][A-Za-z0-9_]*)\b/)
        if (labelToken) {
          const name = labelToken[1]
          const expression = afterKeyword.slice(labelToken[0].length).trim()
          const column = content.indexOf(name) + 1
          if (normalizedKeyword === 'equ') {
            symbols.equates[name.toLowerCase()] = {
              name,
              value: expression,
              line: lineNumber,
              column,
            }
          } else {
            symbols.memory[name.toLowerCase()] = {
              name,
              size: expression,
              line: lineNumber,
              column,
            }
          }
        }
      }

      return
    }

    const operands = afterKeyword
      ? afterKeyword.split(',').map((operand) => operand.trim()).filter(Boolean)
      : []

    instructions.push({
      opcode: normalizedKeyword,
      operands,
      line: lineNumber,
      column: keywordColumn,
      raw: trimmed,
      recognized: opcodeSet.has(normalizedKeyword),
    })
  })

  return {
    instructions,
    symbols,
    diagnostics,
  }
}
