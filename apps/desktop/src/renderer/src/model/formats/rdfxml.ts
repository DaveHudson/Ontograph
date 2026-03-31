import type { Quad } from 'n3';
import { RdfXmlParser } from 'rdfxml-streaming-parser';
import { type ParseWarning, walkQuads } from '../quads';
import type { Ontology } from '../types';
import { createEmptyOntology } from '../types';
import type { FormatAdapter, ParseResult } from './index';

function parseRdfXmlSync(content: string): { quads: Quad[]; prefixes: Map<string, string> } {
  const quads: Quad[] = [];
  const prefixes = new Map<string, string>();

  const parser = new RdfXmlParser();

  let error: Error | null = null;

  parser.on('data', (quad: Quad) => {
    quads.push(quad);
  });

  parser.on('prefix', (prefix: string, iri: { value: string }) => {
    if (prefix) prefixes.set(prefix, iri.value);
  });

  parser.on('error', (err: Error) => {
    error = err;
  });

  parser.write(content);
  parser.end();

  if (error) throw error;

  return { quads, prefixes };
}

export function parseRdfXmlWithWarnings(content: string): ParseResult {
  const warnings: ParseWarning[] = [];

  let quads: Quad[];
  let prefixes: Map<string, string>;

  try {
    const result = parseRdfXmlSync(content);
    quads = result.quads;
    prefixes = result.prefixes;
  } catch (err: unknown) {
    warnings.push({
      severity: 'error',
      message: `RDF/XML parse error: ${(err as Error).message}`,
    });
    return { ontology: createEmptyOntology(), warnings };
  }

  const walkResult = walkQuads(quads, prefixes);
  walkResult.warnings.unshift(...warnings);
  return walkResult;
}

function escAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toQName(uri: string, prefixes: Record<string, string>): string | null {
  // Longest-namespace-first for correct matching
  const sorted = Object.entries(prefixes).sort(([, a], [, b]) => b.length - a.length);
  for (const [prefix, ns] of sorted) {
    if (uri.startsWith(ns)) {
      const local = uri.slice(ns.length);
      // XML NCName: starts with letter or underscore, rest are word chars, dots, or hyphens
      if (local && /^[a-zA-Z_][\w.-]*$/.test(local)) {
        return `${prefix}:${local}`;
      }
    }
  }
  return null;
}

export function serializeToRdfXml(ontology: Ontology): string {
  // Merge core prefixes with ontology-defined prefixes (core take priority for rdf/rdfs/owl/xsd)
  const prefixes: Record<string, string> = {
    owl: 'http://www.w3.org/2002/07/owl#',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
  };
  for (const [prefix, iri] of ontology.prefixes) {
    if (!prefixes[prefix]) prefixes[prefix] = iri;
  }

  const nsAttrs = Object.keys(prefixes)
    .sort()
    .map((p) => `  xmlns:${p}="${escAttr(prefixes[p])}"`)
    .join('\n');

  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', `<rdf:RDF\n${nsAttrs}\n>`, ''];

  // Ontology metadata
  if (ontology.ontologyMetadata) {
    const meta = ontology.ontologyMetadata;
    lines.push(`  <owl:Ontology rdf:about="${escAttr(meta.iri)}">`);
    if (meta.versionIRI) {
      lines.push(`    <owl:versionIRI rdf:resource="${escAttr(meta.versionIRI)}"/>`);
    }
    for (const imp of [...meta.imports].sort()) {
      lines.push(`    <owl:imports rdf:resource="${escAttr(imp)}"/>`);
    }
    for (const ann of [...meta.annotations].sort(
      (a, b) => a.property.localeCompare(b.property) || a.value.localeCompare(b.value),
    )) {
      const qname = toQName(ann.property, prefixes);
      if (!qname) continue;
      if (ann.datatype) {
        lines.push(
          `    <${qname} rdf:datatype="${escAttr(ann.datatype)}">${escText(ann.value)}</${qname}>`,
        );
      } else {
        lines.push(`    <${qname}>${escText(ann.value)}</${qname}>`);
      }
    }
    lines.push(`  </owl:Ontology>`);
    lines.push('');
  }

  // Classes
  for (const cls of [...ontology.classes.values()].sort((a, b) => a.uri.localeCompare(b.uri))) {
    lines.push(`  <owl:Class rdf:about="${escAttr(cls.uri)}">`);
    if (cls.label) lines.push(`    <rdfs:label>${escText(cls.label)}</rdfs:label>`);
    if (cls.comment) lines.push(`    <rdfs:comment>${escText(cls.comment)}</rdfs:comment>`);
    for (const parent of [...cls.subClassOf].sort()) {
      lines.push(`    <rdfs:subClassOf rdf:resource="${escAttr(parent)}"/>`);
    }
    for (const disjoint of [...cls.disjointWith].sort()) {
      lines.push(`    <owl:disjointWith rdf:resource="${escAttr(disjoint)}"/>`);
    }
    lines.push(`  </owl:Class>`);
    lines.push('');
  }

  // Object properties
  for (const prop of [...ontology.objectProperties.values()].sort((a, b) =>
    a.uri.localeCompare(b.uri),
  )) {
    lines.push(`  <owl:ObjectProperty rdf:about="${escAttr(prop.uri)}">`);
    if (prop.label) lines.push(`    <rdfs:label>${escText(prop.label)}</rdfs:label>`);
    if (prop.comment) lines.push(`    <rdfs:comment>${escText(prop.comment)}</rdfs:comment>`);
    for (const d of [...prop.domain].sort()) {
      lines.push(`    <rdfs:domain rdf:resource="${escAttr(d)}"/>`);
    }
    for (const r of [...prop.range].sort()) {
      lines.push(`    <rdfs:range rdf:resource="${escAttr(r)}"/>`);
    }
    if (prop.inverseOf) {
      lines.push(`    <owl:inverseOf rdf:resource="${escAttr(prop.inverseOf)}"/>`);
    }
    lines.push(`  </owl:ObjectProperty>`);
    lines.push('');
  }

  // Datatype properties
  for (const prop of [...ontology.datatypeProperties.values()].sort((a, b) =>
    a.uri.localeCompare(b.uri),
  )) {
    lines.push(`  <owl:DatatypeProperty rdf:about="${escAttr(prop.uri)}">`);
    if (prop.label) lines.push(`    <rdfs:label>${escText(prop.label)}</rdfs:label>`);
    if (prop.comment) lines.push(`    <rdfs:comment>${escText(prop.comment)}</rdfs:comment>`);
    for (const d of [...prop.domain].sort()) {
      lines.push(`    <rdfs:domain rdf:resource="${escAttr(d)}"/>`);
    }
    lines.push(`    <rdfs:range rdf:resource="${escAttr(prop.range)}"/>`);
    lines.push(`  </owl:DatatypeProperty>`);
    lines.push('');
  }

  // Annotation properties
  for (const prop of [...ontology.annotationProperties.values()].sort((a, b) =>
    a.uri.localeCompare(b.uri),
  )) {
    lines.push(`  <owl:AnnotationProperty rdf:about="${escAttr(prop.uri)}">`);
    if (prop.label) lines.push(`    <rdfs:label>${escText(prop.label)}</rdfs:label>`);
    if (prop.comment) lines.push(`    <rdfs:comment>${escText(prop.comment)}</rdfs:comment>`);
    for (const parent of [...prop.subPropertyOf].sort()) {
      lines.push(`    <rdfs:subPropertyOf rdf:resource="${escAttr(parent)}"/>`);
    }
    lines.push(`  </owl:AnnotationProperty>`);
    lines.push('');
  }

  // Individuals
  for (const ind of [...ontology.individuals.values()].sort((a, b) => a.uri.localeCompare(b.uri))) {
    lines.push(`  <owl:NamedIndividual rdf:about="${escAttr(ind.uri)}">`);
    for (const typeUri of [...ind.types].sort()) {
      lines.push(`    <rdf:type rdf:resource="${escAttr(typeUri)}"/>`);
    }
    if (ind.label) lines.push(`    <rdfs:label>${escText(ind.label)}</rdfs:label>`);
    if (ind.comment) lines.push(`    <rdfs:comment>${escText(ind.comment)}</rdfs:comment>`);
    for (const assertion of [...ind.objectPropertyAssertions].sort(
      (a, b) => a.property.localeCompare(b.property) || a.target.localeCompare(b.target),
    )) {
      const qname = toQName(assertion.property, prefixes);
      if (!qname) continue;
      lines.push(`    <${qname} rdf:resource="${escAttr(assertion.target)}"/>`);
    }
    for (const assertion of [...ind.dataPropertyAssertions].sort(
      (a, b) => a.property.localeCompare(b.property) || a.value.localeCompare(b.value),
    )) {
      const qname = toQName(assertion.property, prefixes);
      if (!qname) continue;
      if (assertion.datatype) {
        lines.push(
          `    <${qname} rdf:datatype="${escAttr(assertion.datatype)}">${escText(assertion.value)}</${qname}>`,
        );
      } else {
        lines.push(`    <${qname}>${escText(assertion.value)}</${qname}>`);
      }
    }
    lines.push(`  </owl:NamedIndividual>`);
    lines.push('');
  }

  lines.push('</rdf:RDF>');
  return lines.join('\n');
}

export const rdfXmlAdapter: FormatAdapter = {
  extensions: ['.rdf', '.owl'],
  mimeType: 'application/rdf+xml',
  parse: (content) => parseRdfXmlWithWarnings(content),
  serialize: (ontology) => serializeToRdfXml(ontology),
};
