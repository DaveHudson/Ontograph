import type { Quad } from 'n3';
import type {
  AnnotationProperty,
  ClassExpression,
  ClassExpressionAssertion,
  DatatypeProperty,
  Individual,
  ObjectProperty,
  Ontology,
  OntologyClass,
  OWLCharacteristic,
  Restriction,
  RestrictionType,
} from './types';
import { createEmptyOntology } from './types';

const OWL = 'http://www.w3.org/2002/07/owl#';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

const XSD_DATATYPES = new Set([
  `${XSD}string`,
  `${XSD}integer`,
  `${XSD}int`,
  `${XSD}long`,
  `${XSD}short`,
  `${XSD}byte`,
  `${XSD}float`,
  `${XSD}double`,
  `${XSD}decimal`,
  `${XSD}boolean`,
  `${XSD}date`,
  `${XSD}dateTime`,
  `${XSD}time`,
  `${XSD}anyURI`,
  `${XSD}nonNegativeInteger`,
  `${XSD}positiveInteger`,
]);

function isDatatypeURI(uri: string): boolean {
  return XSD_DATATYPES.has(uri) || uri.startsWith(XSD);
}

function getOrCreateClass(ontology: Ontology, uri: string): OntologyClass {
  let cls = ontology.classes.get(uri);
  if (!cls) {
    cls = { uri, subClassOf: [], disjointWith: [] };
    ontology.classes.set(uri, cls);
  }
  return cls;
}

function getOrCreateObjectProperty(ontology: Ontology, uri: string): ObjectProperty {
  let prop = ontology.objectProperties.get(uri);
  if (!prop) {
    prop = { uri, domain: [], range: [], characteristics: [] };
    ontology.objectProperties.set(uri, prop);
  }
  return prop;
}

const OWL_CHARACTERISTIC_MAP: Record<string, OWLCharacteristic> = {
  [`${OWL}TransitiveProperty`]: 'transitive',
  [`${OWL}SymmetricProperty`]: 'symmetric',
  [`${OWL}ReflexiveProperty`]: 'reflexive',
  [`${OWL}FunctionalProperty`]: 'functional',
  [`${OWL}InverseFunctionalProperty`]: 'inverseFunctional',
};

function getOrCreateDatatypeProperty(ontology: Ontology, uri: string): DatatypeProperty {
  let prop = ontology.datatypeProperties.get(uri);
  if (!prop) {
    prop = { uri, domain: [], range: `${XSD}string` };
    ontology.datatypeProperties.set(uri, prop);
  }
  return prop;
}

function getOrCreateIndividual(ontology: Ontology, uri: string): Individual {
  let ind = ontology.individuals.get(uri);
  if (!ind) {
    ind = { uri, types: [], objectPropertyAssertions: [], dataPropertyAssertions: [] };
    ontology.individuals.set(uri, ind);
  }
  return ind;
}

function getOrCreateAnnotationProperty(ontology: Ontology, uri: string): AnnotationProperty {
  let prop = ontology.annotationProperties.get(uri);
  if (!prop) {
    prop = { uri, subPropertyOf: [] };
    ontology.annotationProperties.set(uri, prop);
  }
  return prop;
}

function localName(uri: string): string {
  const idx = Math.max(uri.lastIndexOf('#'), uri.lastIndexOf('/'));
  return idx >= 0 ? uri.substring(idx + 1) : uri;
}

export interface ParseWarning {
  message: string;
  severity: 'error' | 'warning';
}

export interface WalkQuadsResult {
  ontology: Ontology;
  warnings: ParseWarning[];
}

export function walkQuads(quads: Quad[], prefixes?: Map<string, string>): WalkQuadsResult {
  const warnings: ParseWarning[] = [];
  const ontology = createEmptyOntology();

  if (prefixes) {
    for (const [prefix, iri] of prefixes) {
      if (prefix) ontology.prefixes.set(prefix, iri);
    }
  }

  // Track declared types to distinguish ObjectProperty from DatatypeProperty
  const declaredTypes = new Map<string, Set<string>>();

  // Collect OWL characteristic type tokens per URI (order-independent)
  const pendingCharacteristics = new Map<string, OWLCharacteristic[]>();
  const quadsBySubject = new Map<string, Quad[]>();

  // First pass: collect type declarations
  for (const quad of quads) {
    const s = quad.subject.value;
    const p = quad.predicate.value;
    const o = quad.object.value;

    const bySubject = quadsBySubject.get(s);
    if (bySubject) bySubject.push(quad);
    else quadsBySubject.set(s, [quad]);

    if (p === `${RDF}type`) {
      if (!declaredTypes.has(s)) declaredTypes.set(s, new Set());
      declaredTypes.get(s)?.add(o);

      const charToken = OWL_CHARACTERISTIC_MAP[o];
      if (charToken) {
        if (!pendingCharacteristics.has(s)) pendingCharacteristics.set(s, []);
        pendingCharacteristics.get(s)?.push(charToken);
      }

      if (o === `${OWL}Class` && quad.subject.termType === 'NamedNode') {
        getOrCreateClass(ontology, s);
      } else if (o === `${OWL}ObjectProperty`) {
        getOrCreateObjectProperty(ontology, s);
      } else if (o === `${OWL}DatatypeProperty`) {
        getOrCreateDatatypeProperty(ontology, s);
      } else if (o === `${OWL}NamedIndividual`) {
        if (quad.subject.termType === 'BlankNode') {
          warnings.push({
            severity: 'warning',
            message: `Blank node individual ignored: ${s}`,
          });
        } else {
          getOrCreateIndividual(ontology, s);
        }
      } else if (o === `${OWL}AnnotationProperty`) {
        if (quad.subject.termType === 'BlankNode') {
          warnings.push({
            severity: 'warning',
            message: `Blank node annotation property ignored: ${s}`,
          });
        } else {
          getOrCreateAnnotationProperty(ontology, s);
        }
      } else if (o === `${OWL}Ontology`) {
        if (quad.subject.termType !== 'BlankNode') {
          ontology.ontologyMetadata = {
            iri: s,
            imports: [],
            annotations: [],
          };
        }
      }
    }
  }

  // Apply collected characteristics to ObjectProperties (handles order-independence)
  for (const [uri, tokens] of pendingCharacteristics) {
    const prop = ontology.objectProperties.get(uri);
    if (prop) {
      prop.characteristics = tokens;
    }
  }

  // Restriction pass: collect blank nodes typed as owl:Restriction
  const restrictionBlankNodes = new Set<string>();
  const restrictionProps = new Map<
    string,
    { onProperty?: string; type?: RestrictionType; value?: string }
  >();

  const RESTRICTION_VALUE_PREDICATES: Record<string, RestrictionType> = {
    [`${OWL}someValuesFrom`]: 'someValuesFrom',
    [`${OWL}allValuesFrom`]: 'allValuesFrom',
    [`${OWL}hasValue`]: 'hasValue',
    [`${OWL}minCardinality`]: 'minCardinality',
    [`${OWL}maxCardinality`]: 'maxCardinality',
    [`${OWL}cardinality`]: 'exactCardinality',
    [`${OWL}minQualifiedCardinality`]: 'minCardinality',
    [`${OWL}maxQualifiedCardinality`]: 'maxCardinality',
    [`${OWL}qualifiedCardinality`]: 'exactCardinality',
  };

  for (const quad of quads) {
    const s = quad.subject.value;
    const p = quad.predicate.value;
    const o = quad.object.value;

    if (p === `${RDF}type` && o === `${OWL}Restriction`) {
      restrictionBlankNodes.add(s);
      if (!restrictionProps.has(s)) restrictionProps.set(s, {});
    }

    if (p === `${OWL}onProperty`) {
      const entry = restrictionProps.get(s) ?? {};
      entry.onProperty = o;
      restrictionProps.set(s, entry);
    }

    const rType = RESTRICTION_VALUE_PREDICATES[p];
    if (rType) {
      const entry = restrictionProps.get(s) ?? {};
      entry.type = rType;
      entry.value = o;
      restrictionProps.set(s, entry);
    }
  }

  const expressionCache = new Map<string, ClassExpression | null>();

  function pushWarning(message: string): void {
    warnings.push({ severity: 'warning', message });
  }

  function ensureClassExpression(cls: OntologyClass, assertion: ClassExpressionAssertion): void {
    if (!cls.classExpressions) cls.classExpressions = [];
    cls.classExpressions.push(assertion);
  }

  function parseExpressionTerm(
    term: Quad['object'],
    trace: Set<string>,
    context: string,
  ): ClassExpression | null {
    if (term.termType === 'NamedNode') {
      return { kind: 'named', uri: term.value };
    }
    if (term.termType !== 'BlankNode') {
      pushWarning(`Malformed class expression for ${context}: unsupported term "${term.value}"`);
      return { kind: 'unknown', reason: `Unsupported term ${term.termType}` };
    }
    return parseExpressionNode(term.value, trace, context);
  }

  function parseRdfList(
    head: string,
    trace: Set<string>,
    context: string,
    visited: Set<string> = new Set(),
  ): ClassExpression[] | null {
    if (head === `${RDF}nil`) return [];
    if (visited.has(head)) {
      pushWarning(`Malformed RDF list cycle in class expression for ${context}`);
      return null;
    }
    visited.add(head);

    const listQuads = quadsBySubject.get(head) ?? [];
    const firstQuads = listQuads.filter((q) => q.predicate.value === `${RDF}first`);
    const restQuads = listQuads.filter((q) => q.predicate.value === `${RDF}rest`);
    if (firstQuads.length === 0 || restQuads.length === 0) {
      pushWarning(`Malformed RDF list in class expression for ${context}`);
      return null;
    }

    const first = parseExpressionTerm(firstQuads[0].object, trace, context);
    if (!first) return null;
    const rest = restQuads[0].object;
    if (rest.termType !== 'NamedNode' && rest.termType !== 'BlankNode') {
      pushWarning(`Malformed RDF list in class expression for ${context}`);
      return null;
    }
    const tail = parseRdfList(rest.value, trace, context, visited);
    if (!tail) return null;
    return [first, ...tail];
  }

  function parseExpressionNode(
    nodeId: string,
    trace: Set<string>,
    context: string,
  ): ClassExpression | null {
    if (trace.has(nodeId)) {
      pushWarning(`Malformed class expression cycle for ${context}`);
      return null;
    }
    const cached = expressionCache.get(nodeId);
    if (cached !== undefined) return cached;

    trace.add(nodeId);
    const nodeQuads = quadsBySubject.get(nodeId) ?? [];

    const union = nodeQuads.find((q) => q.predicate.value === `${OWL}unionOf`);
    if (union) {
      const operands = parseRdfList(union.object.value, trace, context);
      const expr = operands
        ? ({ kind: 'union', operands } as ClassExpression)
        : ({ kind: 'unknown', reason: 'Malformed unionOf list' } as ClassExpression);
      expressionCache.set(nodeId, expr);
      trace.delete(nodeId);
      return expr;
    }

    const intersection = nodeQuads.find((q) => q.predicate.value === `${OWL}intersectionOf`);
    if (intersection) {
      const operands = parseRdfList(intersection.object.value, trace, context);
      const expr = operands
        ? ({ kind: 'intersection', operands } as ClassExpression)
        : ({ kind: 'unknown', reason: 'Malformed intersectionOf list' } as ClassExpression);
      expressionCache.set(nodeId, expr);
      trace.delete(nodeId);
      return expr;
    }

    const complement = nodeQuads.find((q) => q.predicate.value === `${OWL}complementOf`);
    if (complement) {
      const operand = parseExpressionTerm(complement.object, trace, context);
      const expr = operand
        ? ({ kind: 'complement', operand } as ClassExpression)
        : ({ kind: 'unknown', reason: 'Malformed complementOf target' } as ClassExpression);
      expressionCache.set(nodeId, expr);
      trace.delete(nodeId);
      return expr;
    }

    pushWarning(`Malformed class expression node for ${context}: ${localName(nodeId)}`);
    const expr: ClassExpression = {
      kind: 'unknown',
      reason: `Unsupported expression node ${nodeId}`,
    };
    expressionCache.set(nodeId, expr);
    trace.delete(nodeId);
    return expr;
  }

  // Second pass: process properties and relationships
  for (const quad of quads) {
    const s = quad.subject.value;
    const p = quad.predicate.value;
    const o = quad.object.value;

    if (p === `${RDF}type`) {
      const ind = ontology.individuals.get(s);
      if (ind && o !== `${OWL}NamedIndividual`) {
        if (!ind.types.includes(o)) ind.types.push(o);
      }
      continue;
    }

    // owl:Ontology metadata
    if (ontology.ontologyMetadata && s === ontology.ontologyMetadata.iri) {
      if (p === `${OWL}versionIRI`) {
        ontology.ontologyMetadata.versionIRI = o;
        continue;
      }
      if (p === `${OWL}imports`) {
        ontology.ontologyMetadata.imports.push(o);
        continue;
      }
      if (p !== `${RDF}type`) {
        const datatype =
          quad.object.termType === 'Literal'
            ? (quad.object as { datatype?: { value: string } }).datatype?.value
            : undefined;
        ontology.ontologyMetadata.annotations.push({
          property: p,
          value: o,
          datatype: datatype || undefined,
        });
        continue;
      }
    }

    if (p === `${RDFS}label`) {
      const literal = quad.object.termType === 'Literal' ? quad.object.value : o;
      const cls = ontology.classes.get(s);
      const objProp = ontology.objectProperties.get(s);
      const dtProp = ontology.datatypeProperties.get(s);
      const ind = ontology.individuals.get(s);
      const annProp = ontology.annotationProperties.get(s);
      if (cls) {
        cls.label = literal;
      } else if (objProp) {
        objProp.label = literal;
      } else if (dtProp) {
        dtProp.label = literal;
      } else if (ind) {
        ind.label = literal;
      } else if (annProp) {
        annProp.label = literal;
      }
      continue;
    }

    if (p === `${RDFS}comment`) {
      const literal = quad.object.termType === 'Literal' ? quad.object.value : o;
      const cls = ontology.classes.get(s);
      const objProp = ontology.objectProperties.get(s);
      const dtProp = ontology.datatypeProperties.get(s);
      const ind = ontology.individuals.get(s);
      const annProp = ontology.annotationProperties.get(s);
      if (cls) {
        cls.comment = literal;
      } else if (objProp) {
        objProp.comment = literal;
      } else if (dtProp) {
        dtProp.comment = literal;
      } else if (ind) {
        ind.comment = literal;
      } else if (annProp) {
        annProp.comment = literal;
      }
      continue;
    }

    if (p === `${RDFS}subPropertyOf`) {
      const annProp = ontology.annotationProperties.get(s);
      if (annProp && !annProp.subPropertyOf.includes(o)) {
        annProp.subPropertyOf.push(o);
      }
      continue;
    }

    if (p === `${RDFS}subClassOf`) {
      if (restrictionBlankNodes.has(o)) {
        const rData = restrictionProps.get(o);
        if (!rData?.onProperty) {
          warnings.push({
            severity: 'warning',
            message: `Restriction on ${s} missing owl:onProperty — skipped`,
          });
          continue;
        }
        if (rData.type && rData.value !== undefined) {
          const cls = getOrCreateClass(ontology, s);
          const restriction: Restriction = {
            onProperty: rData.onProperty,
            type: rData.type,
            value: rData.value,
          };
          if (!cls.restrictions) cls.restrictions = [];
          cls.restrictions.push(restriction);
        }
        continue;
      }
      if (quad.object.termType === 'BlankNode') {
        const expr = parseExpressionTerm(quad.object, new Set(), s);
        if (expr) {
          const cls = getOrCreateClass(ontology, s);
          ensureClassExpression(cls, { source: 'subClassOf', expression: expr });
        }
        continue;
      }
      const cls = getOrCreateClass(ontology, s);
      if (quad.object.termType === 'NamedNode') getOrCreateClass(ontology, o);
      if (!cls.subClassOf.includes(o)) {
        cls.subClassOf.push(o);
      }
      continue;
    }

    if (p === `${OWL}equivalentClass`) {
      const cls = getOrCreateClass(ontology, s);
      const expr = parseExpressionTerm(quad.object, new Set(), s);
      if (expr) ensureClassExpression(cls, { source: 'equivalentClass', expression: expr });
      continue;
    }

    if (p === `${OWL}disjointWith`) {
      const cls = getOrCreateClass(ontology, s);
      if (quad.object.termType === 'NamedNode' && !cls.disjointWith.includes(o)) {
        cls.disjointWith.push(o);
      }
      continue;
    }

    if (p === `${RDFS}domain`) {
      if (quad.object.termType === 'NamedNode') getOrCreateClass(ontology, o);
      const objProp = ontology.objectProperties.get(s);
      const dtProp = ontology.datatypeProperties.get(s);
      if (objProp) {
        if (!objProp.domain.includes(o)) objProp.domain.push(o);
      } else if (dtProp) {
        if (!dtProp.domain.includes(o)) dtProp.domain.push(o);
      }
      continue;
    }

    if (p === `${RDFS}range`) {
      const objProp = ontology.objectProperties.get(s);
      const dtProp = ontology.datatypeProperties.get(s);
      if (objProp) {
        if (quad.object.termType === 'NamedNode') {
          getOrCreateClass(ontology, o);
          if (!objProp.range.includes(o)) objProp.range.push(o);
        }
      } else if (dtProp) {
        dtProp.range = o;
      } else if (isDatatypeURI(o)) {
        const prop = getOrCreateDatatypeProperty(ontology, s);
        prop.range = o;
      }
      continue;
    }

    if (p === `${OWL}inverseOf`) {
      const prop = ontology.objectProperties.get(s);
      if (prop) {
        prop.inverseOf = o;
      }
      continue;
    }

    // Individual property assertions
    const ind = ontology.individuals.get(s);
    if (ind) {
      if (quad.object.termType === 'Literal') {
        const datatype = (quad.object as { datatype?: { value: string } }).datatype?.value;
        ind.dataPropertyAssertions.push({
          property: p,
          value: o,
          datatype: datatype || undefined,
        });
      } else if (quad.object.termType === 'NamedNode') {
        ind.objectPropertyAssertions.push({ property: p, target: o });
      }
    }
  }

  // Detect unsupported OWL constructs
  const unsupported = new Set<string>();
  const UNSUPPORTED_TYPES = [`${OWL}AllDifferent`];
  for (const quad of quads) {
    if (quad.predicate.value === `${RDF}type` && UNSUPPORTED_TYPES.includes(quad.object.value)) {
      const name = quad.object.value.split('#').pop() || quad.object.value;
      unsupported.add(name);
    }
  }
  if (unsupported.size > 0) {
    warnings.push({
      severity: 'warning',
      message: `Unsupported OWL constructs ignored: ${[...unsupported].join(', ')}`,
    });
  }

  if (
    ontology.classes.size === 0 &&
    ontology.objectProperties.size === 0 &&
    ontology.datatypeProperties.size === 0 &&
    ontology.individuals.size === 0
  ) {
    warnings.push({
      severity: 'warning',
      message: 'No OWL classes or properties found in this file',
    });
  }

  return { ontology, warnings };
}
