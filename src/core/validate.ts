// Checks model-written arguments against a tool's JSON Schema.
// A deliberately SMALL subset: type, properties, required,
// additionalProperties: false, items and enum. Errors carry a
// path like $.flags[0], so the model knows exactly what to fix.
type Schema = Record<string, unknown>;

export function validate(
  value: unknown, schema: Schema, path = '$'
): string[] {
  const type = schema.type;
  if (typeof type !== 'string') {
    return [`${path}: schema must declare a type`];
  }
  // Wrong type? Stop here: checking inside it makes no sense.
  if (!matchesType(value, type)) return [`${path}: expected ${type}`];

  const errors: string[] = [];
  if (Array.isArray(schema.enum) &&
      !schema.enum.some(item => Object.is(item, value))) {
    errors.push(`${path}: not an allowed value`);
  }
  if (type === 'object') {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, Schema>;
    for (const key of (schema.required ?? []) as string[]) {
      if (!Object.hasOwn(obj, key)) errors.push(`${path}.${key}: required`);
    }
    for (const [key, item] of Object.entries(obj)) {
      if (Object.hasOwn(props, key)) {
        // Recursion: check the value with ITS schema, one level deeper.
        errors.push(...validate(item, props[key]!, `${path}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}.${key}: unexpected property`);
      }
    }
  }
  if (type === 'array' && typeof schema.items === 'object') {
    const items = schema.items as Schema;
    (value as unknown[]).forEach((item, i) => {
      errors.push(...validate(item, items, `${path}[${i}]`));
    });
  }
  return errors;
}

// One case per JSON Schema type: reads like a table, not a riddle.
function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case 'object':
      return typeof value === 'object' && value !== null
        && !Array.isArray(value);
    case 'array':   return Array.isArray(value);
    case 'integer': return Number.isInteger(value);
    case 'number':  return Number.isFinite(value);
    case 'null':    return value === null;
    case 'string':
    case 'boolean': return typeof value === type;
    default:        return false;
  }
}
