import type { Ontology } from '../model/types';

export interface ValidationError {
  severity: 'error' | 'warning';
  message: string;
  elementUri: string;
  elementType: 'class' | 'objectProperty' | 'datatypeProperty' | 'individual';
}

export function validateOntology(ontology: Ontology): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check classes
  for (const cls of ontology.classes.values()) {
    // SubClassOf references must exist
    for (const parentUri of cls.subClassOf) {
      if (!ontology.classes.has(parentUri)) {
        errors.push({
          severity: 'error',
          message: `Subclass parent "${localName(parentUri)}" does not exist`,
          elementUri: cls.uri,
          elementType: 'class',
        });
      }
    }

    // Circular subClassOf detection
    if (hasCircularInheritance(cls.uri, ontology)) {
      errors.push({
        severity: 'error',
        message: 'Circular inheritance detected',
        elementUri: cls.uri,
        elementType: 'class',
      });
    }

    // DisjointWith references must exist
    for (const djUri of cls.disjointWith) {
      if (!ontology.classes.has(djUri)) {
        errors.push({
          severity: 'warning',
          message: `Disjoint class "${localName(djUri)}" does not exist`,
          elementUri: cls.uri,
          elementType: 'class',
        });
      }
    }

    // Class with no label
    if (!cls.label) {
      errors.push({
        severity: 'warning',
        message: 'Class has no label',
        elementUri: cls.uri,
        elementType: 'class',
      });
    }
  }

  // Check object properties
  for (const prop of ontology.objectProperties.values()) {
    // Domain must reference existing classes
    for (const domainUri of prop.domain) {
      if (!ontology.classes.has(domainUri)) {
        errors.push({
          severity: 'error',
          message: `Domain class "${localName(domainUri)}" does not exist`,
          elementUri: prop.uri,
          elementType: 'objectProperty',
        });
      }
    }

    // Range must reference existing classes
    for (const rangeUri of prop.range) {
      if (!ontology.classes.has(rangeUri)) {
        errors.push({
          severity: 'error',
          message: `Range class "${localName(rangeUri)}" does not exist`,
          elementUri: prop.uri,
          elementType: 'objectProperty',
        });
      }
    }

    // Property with no domain or range
    if (prop.domain.length === 0) {
      errors.push({
        severity: 'warning',
        message: 'Object property has no domain',
        elementUri: prop.uri,
        elementType: 'objectProperty',
      });
    }
    if (prop.range.length === 0) {
      errors.push({
        severity: 'warning',
        message: 'Object property has no range',
        elementUri: prop.uri,
        elementType: 'objectProperty',
      });
    }

    // InverseOf must reference existing property
    if (prop.inverseOf && !ontology.objectProperties.has(prop.inverseOf)) {
      errors.push({
        severity: 'error',
        message: `Inverse property "${localName(prop.inverseOf)}" does not exist`,
        elementUri: prop.uri,
        elementType: 'objectProperty',
      });
    }
  }

  // Check individuals
  for (const ind of ontology.individuals.values()) {
    // Type assertions should reference existing classes
    for (const typeUri of ind.types) {
      if (!ontology.classes.has(typeUri)) {
        errors.push({
          severity: 'warning',
          message: `Type class "${localName(typeUri)}" does not exist`,
          elementUri: ind.uri,
          elementType: 'individual',
        });
      }
    }

    // Individual with no type assertion
    if (ind.types.length === 0) {
      errors.push({
        severity: 'warning',
        message: 'Individual has no type assertion',
        elementUri: ind.uri,
        elementType: 'individual',
      });
    }

    // Individual with no label
    if (!ind.label) {
      errors.push({
        severity: 'warning',
        message: 'Individual has no label',
        elementUri: ind.uri,
        elementType: 'individual',
      });
    }
  }

  // Check datatype properties
  for (const prop of ontology.datatypeProperties.values()) {
    for (const domainUri of prop.domain) {
      if (!ontology.classes.has(domainUri)) {
        errors.push({
          severity: 'error',
          message: `Domain class "${localName(domainUri)}" does not exist`,
          elementUri: prop.uri,
          elementType: 'datatypeProperty',
        });
      }
    }

    if (prop.domain.length === 0) {
      errors.push({
        severity: 'warning',
        message: 'Datatype property has no domain',
        elementUri: prop.uri,
        elementType: 'datatypeProperty',
      });
    }
  }

  // OWL consistency checks (semantic contradictions)
  errors.push(...checkOWLConsistency(ontology));

  return errors;
}

/**
 * Detects semantic contradictions that make classes logically unsatisfiable:
 * 1. Self-disjoint: A disjointWith A
 * 2. Subclass-disjoint conflict: A subClassOf B AND A disjointWith B
 * 3. Multiple inheritance from mutually disjoint ancestors: A subClassOf B, A subClassOf C, B disjointWith C
 * 4. Functional property with minCardinality > 1
 */
function checkOWLConsistency(ontology: Ontology): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build a symmetric index of disjoint pairs for O(1) lookup
  const disjointPairs = new Set<string>();
  for (const cls of ontology.classes.values()) {
    for (const djUri of cls.disjointWith) {
      disjointPairs.add([cls.uri, djUri].sort().join('\0'));
    }
  }
  const isDisjoint = (a: string, b: string): boolean => disjointPairs.has([a, b].sort().join('\0'));

  // Collect all transitive ancestors for a class (BFS, cycle-safe)
  const getAncestors = (uri: string): string[] => {
    const visited = new Set<string>();
    const queue = [...(ontology.classes.get(uri)?.subClassOf ?? [])];
    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur === undefined || visited.has(cur)) continue;
      visited.add(cur);
      const curCls = ontology.classes.get(cur);
      if (curCls) {
        for (const parent of curCls.subClassOf) {
          if (!visited.has(parent)) queue.push(parent);
        }
      }
    }
    return [...visited];
  };

  for (const cls of ontology.classes.values()) {
    // Check 1: self-disjoint
    if (cls.disjointWith.includes(cls.uri)) {
      errors.push({
        severity: 'error',
        message: 'Class is declared disjoint with itself (unsatisfiable)',
        elementUri: cls.uri,
        elementType: 'class',
      });
    }

    // Check 2: subclass of a class it is also disjoint with
    for (const parentUri of cls.subClassOf) {
      if (isDisjoint(cls.uri, parentUri)) {
        errors.push({
          severity: 'error',
          message: `Class is both a subclass and disjoint with "${localName(parentUri)}" (unsatisfiable)`,
          elementUri: cls.uri,
          elementType: 'class',
        });
      }
    }

    // Check 3: inherits from two mutually disjoint ancestors
    const ancestors = getAncestors(cls.uri);
    let foundAncestorConflict = false;
    for (let i = 0; i < ancestors.length && !foundAncestorConflict; i++) {
      for (let j = i + 1; j < ancestors.length && !foundAncestorConflict; j++) {
        if (isDisjoint(ancestors[i], ancestors[j])) {
          errors.push({
            severity: 'error',
            message: `Class inherits from mutually disjoint classes "${localName(ancestors[i])}" and "${localName(ancestors[j])}" (unsatisfiable)`,
            elementUri: cls.uri,
            elementType: 'class',
          });
          foundAncestorConflict = true;
        }
      }
    }
  }

  // Check 4: functional property with minCardinality > 1
  for (const prop of ontology.objectProperties.values()) {
    if (
      prop.characteristics?.includes('functional') &&
      prop.minCardinality !== undefined &&
      prop.minCardinality > 1
    ) {
      errors.push({
        severity: 'error',
        message: `Functional property has minCardinality ${prop.minCardinality}, contradicting the max-1 functional restriction`,
        elementUri: prop.uri,
        elementType: 'objectProperty',
      });
    }
  }

  return errors;
}

function hasCircularInheritance(startUri: string, ontology: Ontology): boolean {
  const visited = new Set<string>();
  let current = [startUri];

  while (current.length > 0) {
    const next: string[] = [];
    for (const uri of current) {
      const cls = ontology.classes.get(uri);
      if (!cls) continue;
      for (const parentUri of cls.subClassOf) {
        if (parentUri === startUri) return true;
        if (!visited.has(parentUri)) {
          visited.add(parentUri);
          next.push(parentUri);
        }
      }
    }
    current = next;
  }

  return false;
}

function localName(uri: string): string {
  const idx = Math.max(uri.lastIndexOf('#'), uri.lastIndexOf('/'));
  return idx >= 0 ? uri.substring(idx + 1) : uri;
}
