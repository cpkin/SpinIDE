#!/usr/bin/env python3
"""Analyze SpinASM corpus files and generate manifest with resource usage."""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

def parse_mem_declarations(spn_content):
    """Extract memory declarations and calculate total RAM usage."""
    ram_samples = 0
    mem_pattern = re.compile(r'^\s*mem\s+\w+\s+(\d+)', re.IGNORECASE | re.MULTILINE)
    
    for match in mem_pattern.finditer(spn_content):
        ram_samples += int(match.group(1))
    
    return ram_samples

def extract_registers(spn_content):
    """Extract register usage from SpinASM program."""
    registers = set()
    
    # Match register usage patterns
    reg_patterns = [
        r'\bREG(\d+)\b',  # REG0-REG31
        r'\bADCL\b', r'\bADCR\b',
        r'\bDACL\b', r'\bDACR\b',
        r'\bPOT0\b', r'\bPOT1\b', r'\bPOT2\b',
        r'\bSIN0\b', r'\bSIN1\b',
        r'\bRMP0\b', r'\bRMP1\b',
    ]
    
    for pattern in reg_patterns:
        for match in re.finditer(pattern, spn_content, re.IGNORECASE):
            registers.add(match.group(0).upper())
    
    return sorted(list(registers))

def assemble_file(spn_path):
    """Assemble a SpinASM file and extract instruction count."""
    try:
        # Use absolute path for asfv1
        result = subprocess.run(
            ['asfv1', str(spn_path.absolute()), '/tmp/temp.bin'],
            capture_output=True,
            text=True
        )
        
        # Parse instruction count from output
        # Example: "info: Read 4 instructions from input"
        match = re.search(r'Read (\d+) instructions', result.stderr)
        if match:
            return int(match.group(1)), None
        
        # Check for errors
        if result.returncode != 0:
            return None, result.stderr
        
        return None, "Could not parse instruction count"
        
    except Exception as e:
        return None, str(e)

def analyze_corpus():
    """Analyze all corpus files and generate manifest."""
    corpus_dir = Path('tests/corpus')
    manifest = []
    
    # Process official files
    official_dir = corpus_dir / 'official'
    for spn_file in sorted(official_dir.glob('*.spn')):
        with open(spn_file, 'r') as f:
            content = f.read()
        
        # Assemble to get instruction count
        instructions, error = assemble_file(spn_file)
        
        # Parse RAM usage
        ram_samples = parse_mem_declarations(content)
        
        # Extract registers
        registers = extract_registers(content)
        
        entry = {
            'id': spn_file.stem,
            'source': 'official',
            'spnPath': f'tests/corpus/official/{spn_file.name}',
            'expect': {
                'instructions': instructions if instructions is not None else 0,
                'ramSamples': ram_samples,
                'registers': registers
            }
        }
        
        if error:
            entry['notes'] = f'Assembly error: {error}'
        
        manifest.append(entry)
        print(f"✓ {entry['id']}: {instructions} instructions, {ram_samples} RAM samples")
    
    # Process community files
    community_dir = corpus_dir / 'community'
    for spn_file in sorted(community_dir.glob('*.spn')):
        with open(spn_file, 'r') as f:
            content = f.read()
        
        # Assemble to get instruction count
        instructions, error = assemble_file(spn_file)
        
        # Parse RAM usage
        ram_samples = parse_mem_declarations(content)
        
        # Extract registers
        registers = extract_registers(content)
        
        entry = {
            'id': spn_file.stem,
            'source': 'community',
            'spnPath': f'tests/corpus/community/{spn_file.name}',
            'expect': {
                'instructions': instructions if instructions is not None else 0,
                'ramSamples': ram_samples,
                'registers': registers
            }
        }
        
        if error:
            entry['notes'] = f'Assembly error: {error}'
        
        manifest.append(entry)
        print(f"✓ {entry['id']}: {instructions} instructions, {ram_samples} RAM samples")
    
    # Write manifest
    manifest_path = corpus_dir / 'corpus.json'
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\n✓ Generated manifest: {manifest_path}")
    print(f"  Total programs: {len(manifest)}")
    print(f"  Official: {sum(1 for e in manifest if e['source'] == 'official')}")
    print(f"  Community: {sum(1 for e in manifest if e['source'] == 'community')}")

if __name__ == '__main__':
    analyze_corpus()
