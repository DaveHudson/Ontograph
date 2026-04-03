import type { Ontology } from '@renderer/model/types';
import { createEmptyOntology } from '@renderer/model/types';
import { validateOntology } from '@renderer/services/validation';
import { describe, expect, it } from 'vitest';

const EX = 'http://example.org/';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

function makeOntology(fn: (o: Ontology) => void): Ontology {
  const o = createEmptyOntology();
  fn(o);
  return o;
}

describe('validateOntology', () => {
  it('returns no errors for empty ontology', () => {
    expect(validateOntology(createEmptyOntology())).toEqual([]);
  });

  it('returns no errors for valid ontology', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Person`, {
        uri: `${EX}Person`,
        label: 'Person',
        subClassOf: [],
        disjointWith: [],
      });
      o.datatypeProperties.set(`${EX}name`, {
        uri: `${EX}name`,
        label: 'name',
        domain: [`${EX}Person`],
        range: `${XSD}string`,
      });
    });
    const errors = validateOntology(o);
    expect(errors.filter((e) => e.severity === 'error')).toEqual([]);
  });

  it('detects missing subClassOf target', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Employee`, {
        uri: `${EX}Employee`,
        label: 'Employee',
        subClassOf: [`${EX}NonExistent`],
        disjointWith: [],
      });
    });
    const errors = validateOntology(o);
    expect(errors.some((e) => e.severity === 'error' && e.message.includes('does not exist'))).toBe(
      true,
    );
  });

  it('detects circular inheritance', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}A`, {
        uri: `${EX}A`,
        label: 'A',
        subClassOf: [`${EX}B`],
        disjointWith: [],
      });
      o.classes.set(`${EX}B`, {
        uri: `${EX}B`,
        label: 'B',
        subClassOf: [`${EX}A`],
        disjointWith: [],
      });
    });
    const errors = validateOntology(o);
    expect(errors.some((e) => e.message === 'Circular inheritance detected')).toBe(true);
  });

  it('detects missing domain class on object property', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Person`, {
        uri: `${EX}Person`,
        label: 'Person',
        subClassOf: [],
        disjointWith: [],
      });
      o.objectProperties.set(`${EX}worksFor`, {
        uri: `${EX}worksFor`,
        label: 'works for',
        domain: [`${EX}NonExistent`],
        range: [`${EX}Person`],
      });
    });
    const errors = validateOntology(o);
    expect(errors.some((e) => e.severity === 'error' && e.message.includes('Domain class'))).toBe(
      true,
    );
  });

  it('detects missing range class on object property', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Person`, {
        uri: `${EX}Person`,
        label: 'Person',
        subClassOf: [],
        disjointWith: [],
      });
      o.objectProperties.set(`${EX}worksFor`, {
        uri: `${EX}worksFor`,
        label: 'works for',
        domain: [`${EX}Person`],
        range: [`${EX}NonExistent`],
      });
    });
    const errors = validateOntology(o);
    expect(errors.some((e) => e.severity === 'error' && e.message.includes('Range class'))).toBe(
      true,
    );
  });

  it('warns on class with no label', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Thing`, {
        uri: `${EX}Thing`,
        subClassOf: [],
        disjointWith: [],
      });
    });
    const errors = validateOntology(o);
    expect(errors.some((e) => e.severity === 'warning' && e.message.includes('no label'))).toBe(
      true,
    );
  });

  it('warns on property with no domain', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Person`, {
        uri: `${EX}Person`,
        label: 'Person',
        subClassOf: [],
        disjointWith: [],
      });
      o.objectProperties.set(`${EX}knows`, {
        uri: `${EX}knows`,
        label: 'knows',
        domain: [],
        range: [`${EX}Person`],
      });
    });
    const errors = validateOntology(o);
    expect(errors.some((e) => e.severity === 'warning' && e.message.includes('no domain'))).toBe(
      true,
    );
  });

  it('detects missing inverse property', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}A`, {
        uri: `${EX}A`,
        label: 'A',
        subClassOf: [],
        disjointWith: [],
      });
      o.objectProperties.set(`${EX}rel`, {
        uri: `${EX}rel`,
        label: 'rel',
        domain: [`${EX}A`],
        range: [`${EX}A`],
        inverseOf: `${EX}nonExistentProp`,
      });
    });
    const errors = validateOntology(o);
    expect(
      errors.some((e) => e.severity === 'error' && e.message.includes('Inverse property')),
    ).toBe(true);
  });
});

describe('validateOntology — individuals', () => {
  it('returns no errors for valid individual', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Person`, {
        uri: `${EX}Person`,
        label: 'Person',
        subClassOf: [],
        disjointWith: [],
      });
      o.individuals.set(`${EX}john`, {
        uri: `${EX}john`,
        label: 'John',
        types: [`${EX}Person`],
        objectPropertyAssertions: [],
        dataPropertyAssertions: [],
      });
    });
    const errors = validateOntology(o).filter((e) => e.elementType === 'individual');
    expect(errors).toEqual([]);
  });

  it('warns on individual with no type assertion', () => {
    const o = makeOntology((o) => {
      o.individuals.set(`${EX}orphan`, {
        uri: `${EX}orphan`,
        label: 'Orphan',
        types: [],
        objectPropertyAssertions: [],
        dataPropertyAssertions: [],
      });
    });
    const errors = validateOntology(o);
    expect(
      errors.some(
        (e) =>
          e.elementType === 'individual' &&
          e.severity === 'warning' &&
          e.message.includes('no type assertion'),
      ),
    ).toBe(true);
  });

  it('warns on individual with dangling type reference', () => {
    const o = makeOntology((o) => {
      o.individuals.set(`${EX}thing`, {
        uri: `${EX}thing`,
        label: 'Thing',
        types: [`${EX}NonExistentClass`],
        objectPropertyAssertions: [],
        dataPropertyAssertions: [],
      });
    });
    const errors = validateOntology(o);
    expect(
      errors.some(
        (e) =>
          e.elementType === 'individual' &&
          e.severity === 'warning' &&
          e.message.includes('does not exist'),
      ),
    ).toBe(true);
  });

  it('warns on individual with no label', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Person`, {
        uri: `${EX}Person`,
        label: 'Person',
        subClassOf: [],
        disjointWith: [],
      });
      o.individuals.set(`${EX}noLabel`, {
        uri: `${EX}noLabel`,
        types: [`${EX}Person`],
        objectPropertyAssertions: [],
        dataPropertyAssertions: [],
      });
    });
    const errors = validateOntology(o);
    expect(
      errors.some(
        (e) =>
          e.elementType === 'individual' &&
          e.severity === 'warning' &&
          e.message.includes('no label'),
      ),
    ).toBe(true);
  });
});

describe('validateOntology — OWL consistency checks', () => {
  it('detects self-disjoint class', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Paradox`, {
        uri: `${EX}Paradox`,
        label: 'Paradox',
        subClassOf: [],
        disjointWith: [`${EX}Paradox`],
      });
    });
    const errors = validateOntology(o);
    expect(
      errors.some((e) => e.severity === 'error' && e.message.includes('disjoint with itself')),
    ).toBe(true);
  });

  it('detects subclass-disjoint conflict (A subClassOf B AND A disjointWith B)', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Animal`, {
        uri: `${EX}Animal`,
        label: 'Animal',
        subClassOf: [],
        disjointWith: [],
      });
      o.classes.set(`${EX}Plant`, {
        uri: `${EX}Plant`,
        label: 'Plant',
        subClassOf: [`${EX}Animal`],
        disjointWith: [`${EX}Animal`],
      });
    });
    const errors = validateOntology(o);
    expect(
      errors.some(
        (e) =>
          e.elementUri === `${EX}Plant` &&
          e.severity === 'error' &&
          e.message.includes('subclass and disjoint'),
      ),
    ).toBe(true);
  });

  it('detects subclass-disjoint conflict when disjointness is stated on the parent', () => {
    const o = makeOntology((o) => {
      // Animal disjointWith Plant, but Plant subClassOf Animal — conflict detected via symmetry
      o.classes.set(`${EX}Animal`, {
        uri: `${EX}Animal`,
        label: 'Animal',
        subClassOf: [],
        disjointWith: [`${EX}Plant`],
      });
      o.classes.set(`${EX}Plant`, {
        uri: `${EX}Plant`,
        label: 'Plant',
        subClassOf: [`${EX}Animal`],
        disjointWith: [],
      });
    });
    const errors = validateOntology(o);
    expect(
      errors.some(
        (e) =>
          e.elementUri === `${EX}Plant` &&
          e.severity === 'error' &&
          e.message.includes('subclass and disjoint'),
      ),
    ).toBe(true);
  });

  it('detects class inheriting from mutually disjoint ancestors', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Cat`, {
        uri: `${EX}Cat`,
        label: 'Cat',
        subClassOf: [],
        disjointWith: [`${EX}Dog`],
      });
      o.classes.set(`${EX}Dog`, {
        uri: `${EX}Dog`,
        label: 'Dog',
        subClassOf: [],
        disjointWith: [],
      });
      // CatDog inherits from both Cat and Dog which are disjoint → unsatisfiable
      o.classes.set(`${EX}CatDog`, {
        uri: `${EX}CatDog`,
        label: 'CatDog',
        subClassOf: [`${EX}Cat`, `${EX}Dog`],
        disjointWith: [],
      });
    });
    const errors = validateOntology(o);
    expect(
      errors.some(
        (e) =>
          e.elementUri === `${EX}CatDog` &&
          e.severity === 'error' &&
          e.message.includes('mutually disjoint'),
      ),
    ).toBe(true);
  });

  it('detects unsatisfiable class via transitive ancestor disjointness', () => {
    const o = makeOntology((o) => {
      // A disjointWith B
      // C subClassOf A
      // D subClassOf B
      // E subClassOf C AND D  →  E inherits from disjoint ancestors A and B
      o.classes.set(`${EX}A`, {
        uri: `${EX}A`,
        label: 'A',
        subClassOf: [],
        disjointWith: [`${EX}B`],
      });
      o.classes.set(`${EX}B`, {
        uri: `${EX}B`,
        label: 'B',
        subClassOf: [],
        disjointWith: [],
      });
      o.classes.set(`${EX}C`, {
        uri: `${EX}C`,
        label: 'C',
        subClassOf: [`${EX}A`],
        disjointWith: [],
      });
      o.classes.set(`${EX}D`, {
        uri: `${EX}D`,
        label: 'D',
        subClassOf: [`${EX}B`],
        disjointWith: [],
      });
      o.classes.set(`${EX}E`, {
        uri: `${EX}E`,
        label: 'E',
        subClassOf: [`${EX}C`, `${EX}D`],
        disjointWith: [],
      });
    });
    const errors = validateOntology(o);
    expect(
      errors.some(
        (e) =>
          e.elementUri === `${EX}E` &&
          e.severity === 'error' &&
          e.message.includes('mutually disjoint'),
      ),
    ).toBe(true);
  });

  it('does not flag valid multiple inheritance without disjointness', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Living`, {
        uri: `${EX}Living`,
        label: 'Living',
        subClassOf: [],
        disjointWith: [],
      });
      o.classes.set(`${EX}Aquatic`, {
        uri: `${EX}Aquatic`,
        label: 'Aquatic',
        subClassOf: [],
        disjointWith: [],
      });
      o.classes.set(`${EX}Fish`, {
        uri: `${EX}Fish`,
        label: 'Fish',
        subClassOf: [`${EX}Living`, `${EX}Aquatic`],
        disjointWith: [],
      });
    });
    const errors = validateOntology(o).filter(
      (e) => e.severity === 'error' && e.elementUri === `${EX}Fish`,
    );
    expect(errors).toEqual([]);
  });

  it('detects functional property with minCardinality > 1', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Person`, {
        uri: `${EX}Person`,
        label: 'Person',
        subClassOf: [],
        disjointWith: [],
      });
      o.objectProperties.set(`${EX}hasMother`, {
        uri: `${EX}hasMother`,
        label: 'has mother',
        domain: [`${EX}Person`],
        range: [`${EX}Person`],
        characteristics: ['functional'],
        minCardinality: 2,
      });
    });
    const errors = validateOntology(o);
    expect(
      errors.some(
        (e) =>
          e.elementUri === `${EX}hasMother` &&
          e.severity === 'error' &&
          e.message.includes('Functional property'),
      ),
    ).toBe(true);
  });

  it('does not flag functional property with minCardinality of 1', () => {
    const o = makeOntology((o) => {
      o.classes.set(`${EX}Person`, {
        uri: `${EX}Person`,
        label: 'Person',
        subClassOf: [],
        disjointWith: [],
      });
      o.objectProperties.set(`${EX}hasMother`, {
        uri: `${EX}hasMother`,
        label: 'has mother',
        domain: [`${EX}Person`],
        range: [`${EX}Person`],
        characteristics: ['functional'],
        minCardinality: 1,
      });
    });
    const errors = validateOntology(o).filter(
      (e) => e.severity === 'error' && e.elementUri === `${EX}hasMother`,
    );
    expect(errors).toEqual([]);
  });
});
