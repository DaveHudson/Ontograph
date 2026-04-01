import type {
  ClassExpression,
  ClassExpressionAssertion,
  DatatypeProperty,
  OntologyClass,
  Restriction,
} from '@renderer/model/types';
import { useOntologyStore } from '@renderer/store/ontology';
import { useUIStore } from '@renderer/store/ui';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  cls: OntologyClass;
}

function localName(uri: string): string {
  const idx = Math.max(uri.lastIndexOf('#'), uri.lastIndexOf('/'));
  return idx >= 0 ? uri.substring(idx + 1) : uri;
}

const XSD = 'http://www.w3.org/2001/XMLSchema#';
const XSD_TYPES = [
  'string',
  'boolean',
  'integer',
  'decimal',
  'float',
  'double',
  'date',
  'dateTime',
  'time',
  'duration',
  'anyURI',
  'base64Binary',
  'hexBinary',
  'positiveInteger',
  'negativeInteger',
  'nonNegativeInteger',
  'nonPositiveInteger',
  'long',
  'int',
  'short',
  'byte',
];

export function ClassDetail({ cls }: Props): React.JSX.Element {
  const updateClass = useOntologyStore((s) => s.updateClass);
  const updateDatatypeProperty = useOntologyStore((s) => s.updateDatatypeProperty);
  const ontology = useOntologyStore((s) => s.ontology);
  const setFocusNode = useUIStore((s) => s.setFocusNode);
  const setSelectedNode = useUIStore((s) => s.setSelectedNode);
  const focusClass = (uri: string): void => {
    setSelectedNode(uri);
    setFocusNode(uri);
  };

  const dtProps = Array.from(ontology.datatypeProperties.values()).filter((p) =>
    p.domain.includes(cls.uri),
  );
  const objProps = Array.from(ontology.objectProperties.values()).filter(
    (p) => p.domain.includes(cls.uri) || p.range.includes(cls.uri),
  );

  return (
    <div className="p-3 space-y-4 text-sm">
      <div>
        <div className="text-xs text-muted-foreground mb-0.5">Class</div>
        <div className="font-medium">{localName(cls.uri)}</div>
        <div className="text-xs text-muted-foreground break-all mt-0.5">{cls.uri}</div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cls-label">Label</Label>
        <Input
          id="cls-label"
          defaultValue={cls.label || ''}
          onBlur={(e) => updateClass(cls.uri, { label: e.target.value || undefined })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cls-comment">Comment</Label>
        <Textarea
          id="cls-comment"
          defaultValue={cls.comment || ''}
          onBlur={(e) => updateClass(cls.uri, { comment: e.target.value || undefined })}
          rows={3}
          className="resize-none"
        />
      </div>

      {cls.subClassOf.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Inherits from</div>
          <div className="space-y-0.5">
            {cls.subClassOf.map((uri) => (
              <button
                type="button"
                key={uri}
                className="text-xs bg-secondary rounded px-2 py-1 cursor-pointer hover:bg-accent transition-colors flex items-center gap-1.5 group"
                onClick={() => focusClass(uri)}
              >
                <span className="text-primary underline underline-offset-2 decoration-primary/40 group-hover:decoration-primary transition-colors">
                  {ontology.classes.get(uri)?.label || localName(uri)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {dtProps.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Datatype Properties</div>
          {dtProps.map((p) => (
            <DatatypePropertyRow
              key={p.uri}
              property={p}
              onLabelBlur={(label) => updateDatatypeProperty(p.uri, { label: label || undefined })}
              onRangeChange={(range) => updateDatatypeProperty(p.uri, { range })}
              onCardinalityChange={(changes) => updateDatatypeProperty(p.uri, changes)}
            />
          ))}
        </div>
      )}

      {objProps.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Relationships</div>
          <div className="space-y-0.5">
            {objProps.map((p) => (
              <div
                key={p.uri}
                className="text-xs bg-secondary rounded px-2 py-1 flex items-center gap-1 flex-wrap"
              >
                <span className="font-medium">{p.label || localName(p.uri)}</span>
                {p.domain.includes(cls.uri) && p.range.length > 0 && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    {p.range.map((r) => (
                      <button
                        type="button"
                        key={r}
                        className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary cursor-pointer transition-colors"
                        onClick={() => focusClass(r)}
                      >
                        {ontology.classes.get(r)?.label || localName(r)}
                      </button>
                    ))}
                  </>
                )}
                {p.range.includes(cls.uri) && p.domain.length > 0 && (
                  <>
                    <span className="text-muted-foreground">←</span>
                    {p.domain.map((d) => (
                      <button
                        type="button"
                        key={d}
                        className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary cursor-pointer transition-colors"
                        onClick={() => focusClass(d)}
                      >
                        {ontology.classes.get(d)?.label || localName(d)}
                      </button>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {cls.restrictions && cls.restrictions.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Restrictions</div>
          <div className="space-y-0.5">
            {cls.restrictions.map((r) => (
              <RestrictionPill
                key={`${r.onProperty}-${r.type}-${r.value}`}
                restriction={r}
                ontology={ontology}
                onFocus={focusClass}
              />
            ))}
          </div>
        </div>
      )}

      {cls.classExpressions && cls.classExpressions.length > 0 && (
        <div className="space-y-2">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Class Expressions</div>
            <div className="text-xs text-muted-foreground">Logical definitions for this class</div>
          </div>
          <div className="space-y-2">
            {(() => {
              const seen = new Map<string, number>();
              return cls.classExpressions.map((assertion) => {
                const base = `${assertion.source}:${classExpressionKey(assertion.expression)}`;
                const count = seen.get(base) ?? 0;
                seen.set(base, count + 1);
                return (
                  <ClassExpressionRow
                    key={`${base}:${count}`}
                    assertion={assertion}
                    ontology={ontology}
                    onFocus={focusClass}
                  />
                );
              });
            })()}
          </div>
          <div className="text-xs text-muted-foreground">
            EQUIV = equivalent class · OR = union · AND = intersection · NOT = complement
          </div>
        </div>
      )}
    </div>
  );
}

function DatatypePropertyRow({
  property,
  onLabelBlur,
  onRangeChange,
  onCardinalityChange,
}: {
  property: DatatypeProperty;
  onLabelBlur: (label: string) => void;
  onRangeChange: (range: string) => void;
  onCardinalityChange: (changes: { minCardinality?: number; maxCardinality?: number }) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          defaultValue={property.label || localName(property.uri)}
          onBlur={(e) => onLabelBlur(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="h-8 text-xs flex-1"
        />
        <select
          value={property.range}
          onChange={(e) => onRangeChange(e.target.value)}
          className="shrink-0 bg-card text-muted-foreground font-mono text-xs rounded-md border border-input px-2 py-1.5 outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {XSD_TYPES.map((t) => (
            <option key={t} value={`${XSD}${t}`}>
              {t}
            </option>
          ))}
          {!property.range.startsWith(XSD) && (
            <option value={property.range}>{localName(property.range)}</option>
          )}
        </select>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Cardinality:</span>
        <Input
          type="number"
          min={0}
          placeholder="min"
          defaultValue={property.minCardinality ?? ''}
          onBlur={(e) => {
            const val = e.target.value.trim();
            onCardinalityChange({
              minCardinality: val === '' ? undefined : Math.max(0, parseInt(val, 10)),
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="h-6 text-xs w-14 px-1.5"
        />
        <span>..</span>
        <Input
          type="number"
          min={0}
          placeholder="∞"
          defaultValue={property.maxCardinality ?? ''}
          onBlur={(e) => {
            const val = e.target.value.trim();
            onCardinalityChange({
              maxCardinality: val === '' ? undefined : Math.max(0, parseInt(val, 10)),
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="h-6 text-xs w-14 px-1.5"
        />
      </div>
    </div>
  );
}

function formatRestrictionLabel(r: Restriction): { text: string; targetUri?: string } {
  const prop = localName(r.onProperty);
  switch (r.type) {
    case 'someValuesFrom':
      return { text: `${prop} some`, targetUri: r.value };
    case 'allValuesFrom':
      return { text: `${prop} only`, targetUri: r.value };
    case 'hasValue':
      return { text: `${prop} = ${localName(r.value)}` };
    case 'minCardinality':
      return { text: `${prop} [${r.value}..*]` };
    case 'maxCardinality':
      return { text: `${prop} [0..${r.value}]` };
    case 'exactCardinality':
      return { text: `${prop} [${r.value}..${r.value}]` };
    default:
      return { text: `${prop} ${r.type} ${localName(r.value)}` };
  }
}

function ClassExpressionRow({
  assertion,
  ontology,
  onFocus,
}: {
  assertion: ClassExpressionAssertion;
  ontology: import('@renderer/model/types').Ontology;
  onFocus: (uri: string) => void;
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-border/60 bg-secondary/40 p-2">
      <div className="space-y-1.5">
        {assertion.source === 'equivalentClass' ? (
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              EQUIV
            </Badge>
            <ClassExpressionTree
              expression={assertion.expression}
              ontology={ontology}
              onFocus={onFocus}
            />
          </div>
        ) : (
          <ClassExpressionTree
            expression={assertion.expression}
            ontology={ontology}
            onFocus={onFocus}
          />
        )}
      </div>
    </div>
  );
}

function ClassExpressionTree({
  expression,
  ontology,
  onFocus,
}: {
  expression: ClassExpression;
  ontology: import('@renderer/model/types').Ontology;
  onFocus: (uri: string) => void;
}): React.JSX.Element {
  if (expression.kind === 'named') {
    const label = ontology.classes.get(expression.uri)?.label || localName(expression.uri);
    return (
      <button
        type="button"
        className="text-xs bg-secondary rounded px-2 py-1 cursor-pointer hover:bg-accent transition-colors"
        onClick={() => onFocus(expression.uri)}
      >
        {label}
      </button>
    );
  }

  if (expression.kind === 'unknown') {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">
          Warning
        </Badge>
        <span className="text-xs text-muted-foreground">{expression.reason}</span>
      </div>
    );
  }

  if (expression.kind === 'complement') {
    return (
      <div className="space-y-1">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
          NOT
        </Badge>
        <div className="ml-3 border-l border-border/60 pl-2">
          <ClassExpressionTree
            expression={expression.operand}
            ontology={ontology}
            onFocus={onFocus}
          />
        </div>
      </div>
    );
  }

  const operator = expression.kind === 'union' ? 'OR' : 'AND';
  return (
    <div className="space-y-1">
      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
        {operator}
      </Badge>
      <div className="ml-3 border-l border-border/60 pl-2 space-y-1">
        {(() => {
          const seen = new Map<string, number>();
          return expression.operands.map((operand) => {
            const base = classExpressionKey(operand);
            const count = seen.get(base) ?? 0;
            seen.set(base, count + 1);
            return (
              <ClassExpressionTree
                key={`${base}:${count}`}
                expression={operand}
                ontology={ontology}
                onFocus={onFocus}
              />
            );
          });
        })()}
      </div>
    </div>
  );
}

function classExpressionKey(expression: ClassExpression): string {
  switch (expression.kind) {
    case 'named':
      return `named:${expression.uri}`;
    case 'union':
      return `union(${expression.operands.map(classExpressionKey).join('|')})`;
    case 'intersection':
      return `intersection(${expression.operands.map(classExpressionKey).join('|')})`;
    case 'complement':
      return `complement(${classExpressionKey(expression.operand)})`;
    case 'unknown':
      return `unknown:${expression.reason}`;
    default:
      return expression satisfies never;
  }
}

function RestrictionPill({
  restriction,
  ontology,
  onFocus,
}: {
  restriction: Restriction;
  ontology: import('@renderer/model/types').Ontology;
  onFocus: (uri: string) => void;
}): React.JSX.Element {
  const { text, targetUri } = formatRestrictionLabel(restriction);
  return (
    <div className="text-xs bg-secondary rounded px-2 py-1 flex items-center gap-1 flex-wrap">
      <span className="font-medium">{text}</span>
      {targetUri && (
        <button
          type="button"
          className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary cursor-pointer transition-colors"
          onClick={() => onFocus(targetUri)}
        >
          {ontology.classes.get(targetUri)?.label || localName(targetUri)}
        </button>
      )}
    </div>
  );
}
