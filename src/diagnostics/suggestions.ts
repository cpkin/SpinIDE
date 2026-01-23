import { opcodes } from '../parser/opcodes'

const levenshtein = (value: string, target: string): number => {
  const source = value.toLowerCase()
  const destination = target.toLowerCase()

  const matrix = Array.from({ length: source.length + 1 }, () =>
    new Array(destination.length + 1).fill(0)
  )

  for (let i = 0; i <= source.length; i += 1) {
    matrix[i][0] = i
  }

  for (let j = 0; j <= destination.length; j += 1) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= destination.length; j += 1) {
      const cost = source[i - 1] === destination[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[source.length][destination.length]
}

export const suggestOpcode = (opcode: string): string | null => {
  const normalized = opcode.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  let bestMatch: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of opcodes) {
    const distance = levenshtein(normalized, candidate)
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = candidate
    }
  }

  if (bestMatch && bestDistance <= 2) {
    return `Did you mean "${bestMatch.toUpperCase()}"?`
  }

  return null
}
