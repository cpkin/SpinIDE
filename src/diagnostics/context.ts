export interface LineContextLine {
  lineNumber: number
  text: string
}

export interface LineContext {
  startLine: number
  endLine: number
  lines: LineContextLine[]
}

export const getLineContext = (
  source: string,
  line: number,
  radius = 2
): LineContext => {
  const lines = source.split(/\r?\n/)
  const safeLine = Math.min(Math.max(line, 1), Math.max(lines.length, 1))
  const startLine = Math.max(1, safeLine - radius)
  const endLine = Math.min(lines.length, safeLine + radius)
  const contextLines: LineContextLine[] = []

  for (let current = startLine; current <= endLine; current += 1) {
    contextLines.push({
      lineNumber: current,
      text: lines[current - 1] ?? '',
    })
  }

  return {
    startLine,
    endLine,
    lines: contextLines,
  }
}
