import {
  getAdapterForExtension,
  getAdapterForFilePath,
  sniffAdapterFromContent,
} from '@renderer/model/formats';
import { describe, expect, it } from 'vitest';

describe('format registry', () => {
  it('resolves .ttl to turtle adapter', () => {
    const adapter = getAdapterForExtension('.ttl');
    expect(adapter).toBeDefined();
    expect(adapter?.mimeType).toBe('text/turtle');
  });

  it('resolves .rdf to rdfxml adapter', () => {
    const adapter = getAdapterForExtension('.rdf');
    expect(adapter).toBeDefined();
    expect(adapter?.mimeType).toBe('application/rdf+xml');
  });

  it('resolves .owl to rdfxml adapter', () => {
    const adapter = getAdapterForExtension('.owl');
    expect(adapter).toBeDefined();
    expect(adapter?.mimeType).toBe('application/rdf+xml');
  });

  it('resolves full file path', () => {
    const adapter = getAdapterForFilePath('/some/path/ontology.owl');
    expect(adapter?.mimeType).toBe('application/rdf+xml');
  });

  it('returns undefined for unknown extension', () => {
    const adapter = getAdapterForExtension('.csv');
    expect(adapter).toBeUndefined();
  });

  it('returns undefined for file with no extension', () => {
    expect(getAdapterForFilePath('/some/path/ontology')).toBeUndefined();
  });
});

describe('sniffAdapterFromContent', () => {
  it('detects Turtle via @prefix', () => {
    const adapter = sniffAdapterFromContent('@prefix owl: <http://www.w3.org/2002/07/owl#> .\n');
    expect(adapter?.mimeType).toBe('text/turtle');
  });

  it('detects Turtle via @base', () => {
    const adapter = sniffAdapterFromContent('@base <http://example.org/> .\n');
    expect(adapter?.mimeType).toBe('text/turtle');
  });

  it('detects RDF/XML via <?xml header', () => {
    const adapter = sniffAdapterFromContent(
      '<?xml version="1.0"?>\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    );
    expect(adapter?.mimeType).toBe('application/rdf+xml');
  });

  it('detects RDF/XML via <rdf:RDF tag without xml declaration', () => {
    const adapter = sniffAdapterFromContent(
      '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    );
    expect(adapter?.mimeType).toBe('application/rdf+xml');
  });

  it('detects JSON-LD via @context in JSON object', () => {
    const adapter = sniffAdapterFromContent('{\n  "@context": "http://schema.org/",\n');
    expect(adapter?.mimeType).toBe('application/ld+json');
  });

  it('returns null for unrecognised content', () => {
    const adapter = sniffAdapterFromContent('just some random text\nwith no format markers');
    expect(adapter).toBeNull();
  });

  it('returns null for JSON without @context', () => {
    const adapter = sniffAdapterFromContent('{ "name": "test", "value": 42 }');
    expect(adapter).toBeNull();
  });
});
