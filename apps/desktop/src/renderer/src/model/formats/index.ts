import type { ParseWarning } from '../quads';
import type { Ontology } from '../types';
import { jsonLdAdapter } from './jsonld';
import { rdfXmlAdapter } from './rdfxml';
import { turtleAdapter } from './turtle';

export interface ParseResult {
  ontology: Ontology;
  warnings: ParseWarning[];
}

export interface FormatAdapter {
  extensions: string[];
  mimeType: string;
  parse(content: string): ParseResult;
  serialize?(ontology: Ontology): string;
  parseAsync?(content: string): Promise<ParseResult>;
  serializeAsync?(ontology: Ontology): Promise<string>;
}

const adapters: FormatAdapter[] = [turtleAdapter, rdfXmlAdapter, jsonLdAdapter];

export function getAdapterForExtension(ext: string): FormatAdapter | undefined {
  const normalized = ext.toLowerCase().startsWith('.')
    ? ext.toLowerCase()
    : `.${ext.toLowerCase()}`;
  return adapters.find((a) => a.extensions.includes(normalized));
}

export function getAdapterForFilePath(filePath: string): FormatAdapter | undefined {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) return undefined;
  const ext = filePath.substring(dotIndex).toLowerCase();
  return getAdapterForExtension(ext);
}

export function sniffAdapterFromContent(content: string): FormatAdapter | null {
  const head = content.slice(0, 200);
  if (head.includes('@prefix') || head.includes('@base')) return turtleAdapter;
  if (head.includes('<?xml') || head.includes('<rdf:RDF')) return rdfXmlAdapter;
  if (/"@context"/.test(head) && head.trimStart().startsWith('{')) return jsonLdAdapter;
  return null;
}

export function getAllSupportedExtensions(): string[] {
  return adapters.flatMap((a) => a.extensions);
}

export function getOpenDialogFilters(): { name: string; extensions: string[] }[] {
  const filters: { name: string; extensions: string[] }[] = [];
  const allExts: string[] = [];

  for (const adapter of adapters) {
    const exts = adapter.extensions.map((e) => e.replace(/^\./, ''));
    allExts.push(...exts);
    const name = adapter.mimeType.includes('turtle')
      ? 'Turtle'
      : adapter.mimeType.includes('rdf+xml')
        ? 'RDF/XML'
        : adapter.mimeType.includes('ld+json')
          ? 'JSON-LD'
          : adapter.mimeType;
    filters.push({ name, extensions: exts });
  }

  filters.unshift({ name: 'All Ontology Files', extensions: allExts });
  filters.push({ name: 'All Files', extensions: ['*'] });
  return filters;
}
