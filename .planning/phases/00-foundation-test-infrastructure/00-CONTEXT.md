# Phase 0: Foundation & Test Infrastructure - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock the SpinASM dialect, metadata schema, and simulator strategy; create a validation test corpus and document fidelity targets so implementation can proceed with confidence.

</domain>

<decisions>
## Implementation Decisions

### SpinASM Dialect Scope
- Target official SpinASM only (no SpinCAD/community dialect extensions in Phase 0)
- Support core directives only (equ, mem, org) for initial spec
- Accept semicolon comments only (`;`)
- Unknown opcodes/directives should warn and continue parsing

### Metadata Schema Policy
- Metadata schema v1 has strict required fields (missing fields mark metadata invalid)
- Missing version tag defaults to v1 with a warning
- Incomplete metadata uses a non-blocking status badge (no modal)
- Invalid metadata fields trigger warnings; keep diagram if possible

### Test Corpus Composition
- Include official Spin demo programs plus community-shared examples
- Target 20-30 programs for Phase 0 corpus size
- Each test case asserts parse success + resource checks (instruction count, RAM, registers)
- Include raw `.spn` files in repo (not links only)

### OpenCode's Discretion
- Exact list of core directives included (within equ/mem/org scope)
- Which community examples to include if more than 20-30 are available

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 00-foundation-test-infrastructure*
*Context gathered: 2026-01-22*
