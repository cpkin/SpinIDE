# Phase 0: Foundation & Test Infrastructure - Research

**Researched:** 2026-01-22
**Domain:** SpinASM dialect specification, metadata schema, and validation test corpus
**Confidence:** MEDIUM

## Summary

Research focused on locking the SpinASM dialect, defining a metadata schema v1, and building a reliable test corpus for validation. The most authoritative source available is the Spin Semiconductor SPINAsm User Manual PDF (official, but difficult to parse directly), backed by a community assembler (asfv1) that documents the same syntax and includes concrete examples. JSON Schema (draft 2020-12) is the current, standards-backed way to define and validate the metadata schema.

The standard approach for Phase 0 is to treat the SPINAsm User Manual as canonical for opcode/directive behavior, use JSON Schema 2020-12 for metadata v1, and build a corpus from official demo programs plus vetted community `.spn` examples. Community tooling (asfv1, spinasm-lsp, GitHub example repos) is the best practical reference for edge cases like comments, case-insensitive opcodes, and directive semantics while the official manual is used to resolve final ambiguities.

**Primary recommendation:** Use the SPINAsm User Manual as the authoritative dialect reference, JSON Schema 2020-12 for metadata v1 validation, and a corpus of official demos plus vetted community `.spn` files to lock parser behavior.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SPINAsm User Manual (Spin Semiconductor) | SPN1001-dev PDF | Canonical SpinASM syntax and instruction reference | Official spec for the SpinASM dialect and instruction semantics. |
| JSON Schema | Draft 2020-12 | Metadata schema v1 definition | Current, widely adopted schema standard with formal validation rules. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| asfv1 | 2021+ (README) | Secondary reference for SpinASM syntax/examples | Use to confirm comment handling, directives, and label rules when the manual is ambiguous. |
| spinasm-lsp | 2024+ | Links to official manual and uses asfv1 parser | Use to cross-check opcode lists and editor-facing behavior. |
| fv1experiments (GitHub) | 2020 | Community `.spn` corpus | Use as community test fixtures after vetting license and correctness. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSON Schema | Custom JSON validator | Higher maintenance and less tooling support; lacks standard validation semantics. |
| Official demos only | Community-only corpus | Misses real-world edge cases (comments, label casing, unusual formatting). |

**Installation:**
```bash
pip install asfv1
```

## Architecture Patterns

### Recommended Project Structure
```
docs/
├── spinasm-spec.md        # Dialect spec with syntax and examples
├── simulator-strategy.md  # Fidelity target and simulator reference notes
schemas/
├── metadata-v1.schema.json
tests/
├── corpus/
│   ├── official/          # Official demo .spn files
│   ├── community/         # Vetted community .spn files
│   └── corpus.json         # Manifest of expected resource checks
```

### Pattern 1: Dialect Spec From Canonical Manual + Practical Examples
**What:** Treat SPINAsm User Manual as canonical and use asfv1 examples for syntax clarity (case-insensitive mnemonics, semicolon comments, EQU/MEM directives).
**When to use:** Locking parser rules, especially comment handling and directive syntax.
**Example:**
```asm
; Comment out a whole line
EQU input ADCL     ; assign value of ADCL to input
MEM delay int(32767*3/5)
start: skp RUN,main
```
Source: https://raw.githubusercontent.com/ndf-zz/asfv1/master/README.md

### Pattern 2: Corpus Manifest With Resource Expectations
**What:** Maintain a JSON manifest listing each `.spn` file and expected resource checks (instruction count, RAM usage, registers). Use it to drive parser validation and reporting.
**When to use:** Creating repeatable tests for FOUND-04 and future parser regression checks.
**Example:**
```json
{
  "id": "spin-demo-delay",
  "source": "official",
  "spnPath": "tests/corpus/official/delay.spn",
  "expect": {
    "instructions": 128,
    "ramSamples": 24576,
    "registers": ["REG0", "REG1"]
  }
}
```
Source: Pattern derived from standard JSON Schema validation workflows.

### Anti-Patterns to Avoid
- **Spec from examples only:** risks missing edge cases and undocumented rules; defer to SPINAsm User Manual first.
- **Manual validation without schema:** produces inconsistent metadata rules; use JSON Schema to enforce versioning and required fields.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Metadata validation | Custom JSON validator | JSON Schema 2020-12 | Standard tooling, consistent error reporting, and future extensibility. |
| Dialect reference | Ad-hoc opcode list | SPINAsm User Manual + asfv1 examples | Avoid missing opcodes or syntax rules that real assemblers accept. |

**Key insight:** Using JSON Schema and canonical SpinASM documentation prevents divergent parser behavior that would require rework in later phases.

## Common Pitfalls

### Pitfall 1: Comment and case-sensitivity mismatches
**What goes wrong:** Parser rejects valid programs due to case sensitivity or comment placement.
**Why it happens:** Real-world SpinASM treats mnemonics and labels case-insensitively and uses semicolon comments.
**How to avoid:** Normalize tokens to uppercase and strip `;` comments before parsing.
**Warning signs:** Community `.spn` files fail with basic opcode errors.

### Pitfall 2: Directive behavior ambiguity (EQU/MEM/ORG)
**What goes wrong:** Memory allocation and label resolution differ from reference tools.
**Why it happens:** Directive semantics are underspecified unless aligned with the SPINAsm manual and assembler behavior.
**How to avoid:** Anchor spec wording to the official manual; use asfv1 to confirm behavior in ambiguous cases.
**Warning signs:** Total RAM usage or label offsets differ from reference assemblers.

### Pitfall 3: Corpus lacking real-world formatting
**What goes wrong:** Parser passes official demos but fails on community code with mixed whitespace, labels, or comments.
**Why it happens:** Official demos are clean; community exports contain formatting quirks.
**How to avoid:** Include vetted community `.spn` files and parse case-insensitively with whitespace normalization.
**Warning signs:** Reports like "works in SpinASM but not in SpinGPT."

## Code Examples

Verified patterns from official or de-facto sources:

### Semicolon comments and directives
```asm
; Comment out a whole line
EQU input ADCL
MEM delay int(32767*3/5)
```
Source: https://raw.githubusercontent.com/ndf-zz/asfv1/master/README.md

### Label syntax and case-insensitive mnemonics
```asm
start: skp RUN,main
      ldax POT0
main: wrax DACL,0.0
```
Source: https://raw.githubusercontent.com/ndf-zz/asfv1/master/README.md

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spin-provided IDE/assembler as the only reference | Community parsers (asfv1) and LSP tooling supplement the manual | 2017+ | Enables reproducible syntax reference and test fixtures outside the official IDE. |

**Deprecated/outdated:**
- Unverifiable opcode lists without referencing the SPINAsm User Manual.

## Open Questions

1. **SPINAsm User Manual access for text extraction**
   - What we know: The manual PDF is accessible at Spin Semiconductor URLs, but parsing text directly is non-trivial.
   - What's unclear: Specific wording for `org` directive and edge cases in the official manual.
   - Recommendation: Extract the PDF text with a local tool and quote directly in the spec.
2. **Community tooling gaps from diystompboxes.com**
   - What we know: The forum blocks anonymous search (403).
   - What's unclear: Specific community complaints about SpinASM tooling limitations.
   - Recommendation: Manually review forum threads with FV-1/SpinASM tags and summarize issues.
3. **Community tooling gaps from PedalPCB**
   - What we know: PedalPCB forum homepage loads, but specific FV-1 threads require targeted search.
   - What's unclear: Which tooling pain points are most common among PedalPCB users.
   - Recommendation: Use the forum search for “FV-1” and capture 2+ threads mentioning workflow gaps.

## Sources

### Primary (HIGH confidence)
- http://www.spinsemi.com/Products/datasheets/spn1001-dev/SPINAsmUserManual.pdf - official SpinASM manual (PDF)
- https://json-schema.org/draft/2020-12/json-schema-core.html - JSON Schema 2020-12 core specification

### Secondary (MEDIUM confidence)
- https://raw.githubusercontent.com/ndf-zz/asfv1/master/README.md - SpinASM syntax and directives (community assembler)
- https://raw.githubusercontent.com/aazuspan/spinasm-lsp/main/README.md - links to official manual, LSP overview
- https://raw.githubusercontent.com/mlennox/fv1experiments/master/README.md - community SpinASM examples repository

### Tertiary (LOW confidence)
- https://forum.pedalpcb.com/ - community forum index (no FV-1-specific thread verified)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - official manual is authoritative but hard to parse; JSON Schema is solid.
- Architecture: MEDIUM - patterns derived from standard schema/test practices and community tooling.
- Pitfalls: MEDIUM - based on community assembler behavior and internal project notes.

**Research date:** 2026-01-22
**Valid until:** 2026-02-21
