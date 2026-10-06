#!/usr/bin/env node
/**
 * validate-units.js — sanity check for units/*.json
 *
 * Runs with zero dependencies. Exits non-zero if any file is malformed,
 * so you can wire this into CI or a pre-commit hook.
 *
 * Checks:
 *  - JSON parses
 *  - the file conforms to scripts/unit.schema.json (draft-07 subset, enforced below)
 *  - required fields present (id, title, sections, exercises)
 *  - sections: each has id, title, content (non-empty)
 *  - exercises: supports 4 types
 *      • MCQ (default, or type:"mcq")    — question, options[], correctAnswer index in range
 *      • fill                             — question contains ___, answer non-empty
 *      • reorder                          — tokens[], correctOrder permutation of tokens
 *      • correct                          — sentence + correction both present
 *  - index.json matches the set of unit-*.json files on disk
 *  - HTML inside section.content is at least balanced at the tag level (cheap check)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'units');
const errors = [];
const warnings = [];

function err(file, msg)  { errors.push(`✖ ${file}: ${msg}`); }
function warn(file, msg) { warnings.push(`⚠ ${file}: ${msg}`); }

// --- cheap HTML balance check ------------------------------------------------
// Not a real parser, but catches "<strong>foo<strong>" style mistakes.
function checkHtmlBalance(file, html) {
  const voidTags = new Set(['br','hr','img','input','meta','link']);
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  const stack = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    const selfClose = m[0].startsWith('</') ? 'close' :
                      (m[2] === '/' || voidTags.has(tag)) ? 'void' : 'open';
    if (selfClose === 'open') stack.push(tag);
    else if (selfClose === 'close') {
      if (stack.length === 0 || stack[stack.length-1] !== tag) {
        warn(file, `HTML tag mismatch near </${tag}>`);
        return;
      }
      stack.pop();
    }
  }
  if (stack.length) warn(file, `unclosed HTML tag(s): ${stack.join(', ')}`);
}

// --- JSON Schema (draft-07 subset) -------------------------------------------
// scripts/unit.schema.json is the source of truth for a unit's shape. This is a
// small, dependency-free interpreter for the keywords that schema actually uses:
// $ref, oneOf, type, required, additionalProperties, properties, items,
// minItems, minLength, pattern, minimum, maximum, const, enum.
const SCHEMA_PATH = path.join(__dirname, 'unit.schema.json');
let SCHEMA = null;
try {
  SCHEMA = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
} catch (e) {
  err('unit.schema.json', `cannot be loaded (${e.message}) — refusing to skip schema checks`);
}

function resolveRef(ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  return ref.slice(2).split('/').reduce((node, rawKey) => {
    if (node == null) return null;
    const key = rawKey.replace(/~1/g, '/').replace(/~0/g, '~');
    return node[key];
  }, SCHEMA);
}

function typeOk(value, type) {
  switch (type) {
    case 'object':  return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':   return Array.isArray(value);
    case 'string':  return typeof value === 'string';
    case 'integer': return Number.isInteger(value);
    case 'number':  return typeof value === 'number' && Number.isFinite(value);
    case 'boolean': return typeof value === 'boolean';
    case 'null':    return value === null;
    default:        return true;
  }
}

// Returns a list of human-readable violations of `schema` by `value`.
function schemaViolations(value, schema, at) {
  const found = [];
  if (!schema || typeof schema !== 'object') return found;

  if (schema.$ref) return schemaViolations(value, resolveRef(schema.$ref), at);

  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter(sub => schemaViolations(value, sub, at).length === 0);
    if (matches.length === 0) {
      const detail = schema.oneOf.map((sub, i) => {
        const name = sub.$ref ? sub.$ref.replace('#/definitions/', '') : `branch ${i}`;
        return `${name}(` + schemaViolations(value, sub, at).slice(0, 2).join('; ') + ')';
      }).join(' vs ');
      found.push(`${at}: matches none of the allowed exercise shapes — ${detail}`);
    } else if (matches.length > 1) {
      found.push(`${at}: ambiguous — matches ${matches.length} exercise shapes at once`);
    }
    return found;
  }

  if (schema.type && !typeOk(value, schema.type)) {
    const isArray = Array.isArray(value);
    const actual = value === null ? 'null' : isArray ? 'array' : typeof value;
    found.push(`${at}: expected ${schema.type}, got ${actual}`);
    return found; // other keywords would only produce noise
  }

  if ('const' in schema && value !== schema.const)
    found.push(`${at}: must be ${JSON.stringify(schema.const)} (got ${JSON.stringify(value)})`);
  if (Array.isArray(schema.enum) && !schema.enum.includes(value))
    found.push(`${at}: must be one of ${JSON.stringify(schema.enum)} (got ${JSON.stringify(value)})`);

  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength)
      found.push(`${at}: must be at least ${schema.minLength} character(s) long`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value))
      found.push(`${at}: does not match required pattern /${schema.pattern}/`);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (schema.minimum != null && value < schema.minimum)
      found.push(`${at}: must be ≥ ${schema.minimum} (got ${value})`);
    if (schema.maximum != null && value > schema.maximum)
      found.push(`${at}: must be ≤ ${schema.maximum} (got ${value})`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems)
      found.push(`${at}: needs at least ${schema.minItems} item(s) (got ${value.length})`);
    if (schema.items)
      value.forEach((item, i) => found.push(...schemaViolations(item, schema.items, `${at}[${i}]`)));
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || [])
      if (!(key in value)) found.push(`${at}: missing required property "${key}"`);
    const props = schema.properties || {};
    if (schema.additionalProperties === false)
      for (const key of Object.keys(value))
        if (!(key in props)) found.push(`${at}: unknown property "${key}" (not allowed by the schema)`);
    for (const [key, sub] of Object.entries(props))
      if (key in value)
        found.push(...schemaViolations(value[key], sub, at ? `${at}.${key}` : key));
  }

  return found;
}

function validateAgainstSchema(file, data) {
  if (!SCHEMA) return; // load failure already reported as an error
  const violations = schemaViolations(data, SCHEMA, '');
  const MAX = 8;
  violations.slice(0, MAX).forEach(v => err(file, `schema: ${v}`));
  if (violations.length > MAX)
    err(file, `schema: …and ${violations.length - MAX} more violation(s)`);
}

// --- exercise validators -----------------------------------------------------
function validateExercise(file, ex, i) {
  const where = `exercise[${i}]`;
  const type = ex.type || 'mcq';

  switch (type) {
    case 'mcq': {
      if (typeof ex.question !== 'string' || !ex.question.trim())
        return err(file, `${where}: missing question`);
      if (!Array.isArray(ex.options) || ex.options.length < 2)
        return err(file, `${where}: options must be an array of ≥ 2 strings`);
      if (!ex.options.every(o => typeof o === 'string' && o.length))
        return err(file, `${where}: all options must be non-empty strings`);
      if (!Number.isInteger(ex.correctAnswer) ||
          ex.correctAnswer < 0 ||
          ex.correctAnswer >= ex.options.length)
        return err(file, `${where}: correctAnswer out of range`);
      break;
    }
    case 'fill': {
      if (typeof ex.question !== 'string' || !ex.question.includes('___'))
        return err(file, `${where}: fill-blank needs '___' in question`);
      if (typeof ex.answer !== 'string' || !ex.answer.trim())
        return err(file, `${where}: missing answer`);
      break;
    }
    case 'reorder': {
      if (!Array.isArray(ex.tokens) || ex.tokens.length < 2)
        return err(file, `${where}: reorder needs tokens array`);
      if (!Array.isArray(ex.correctOrder) ||
          ex.correctOrder.length !== ex.tokens.length)
        return err(file, `${where}: correctOrder length mismatch`);
      const sorted = [...ex.correctOrder].sort((a,b)=>a-b);
      for (let k = 0; k < sorted.length; k++)
        if (sorted[k] !== k)
          return err(file, `${where}: correctOrder must be a permutation of 0..n-1`);
      break;
    }
    case 'correct': {
      if (typeof ex.sentence !== 'string' || !ex.sentence.trim())
        return err(file, `${where}: missing sentence`);
      if (typeof ex.correction !== 'string' || !ex.correction.trim())
        return err(file, `${where}: missing correction`);
      break;
    }
    default:
      return err(file, `${where}: unknown type "${type}"`);
  }
}

// --- unit file validator -----------------------------------------------------
function validateUnit(file, data) {
  validateAgainstSchema(file, data); // schema shape first, then the semantic checks
  if (typeof data.id !== 'number')    err(file, 'id must be a number');
  if (typeof data.title !== 'string') err(file, 'title must be a string');
  if (!Array.isArray(data.sections) || !data.sections.length)
    return err(file, 'sections must be a non-empty array');
  if (!Array.isArray(data.exercises))
    return err(file, 'exercises must be an array');

  const seenSectionIds = new Set();
  data.sections.forEach((s, i) => {
    if (!s.id || !s.title || !s.content)
      return err(file, `section[${i}]: missing id/title/content`);
    if (seenSectionIds.has(s.id))
      err(file, `section[${i}]: duplicate id "${s.id}"`);
    seenSectionIds.add(s.id);
    checkHtmlBalance(file, s.content);
  });

  data.exercises.forEach((ex, i) => validateExercise(file, ex, i));
}

// --- run ---------------------------------------------------------------------
function main() {
  if (!fs.existsSync(ROOT)) {
    console.error('units/ directory not found at', ROOT);
    process.exit(2);
  }

  const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.json'));
  const unitFiles = files.filter(f => /^unit-\d+\.json$/.test(f));

  // index.json
  const indexPath = path.join(ROOT, 'index.json');
  if (!fs.existsSync(indexPath)) {
    err('index.json', 'missing');
  } else {
    try {
      const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      if (!Array.isArray(idx)) err('index.json', 'must be an array');
      else {
        const indexIds  = new Set(idx.map(e => e.id));
        const diskIds   = new Set(unitFiles.map(f => +f.match(/\d+/)[0]));
        for (const id of indexIds)
          if (!diskIds.has(id)) err('index.json', `references missing unit-${id}.json`);
        for (const id of diskIds)
          if (!indexIds.has(id)) warn('index.json', `unit-${id}.json exists but is not in index`);
      }
    } catch (e) {
      err('index.json', `invalid JSON: ${e.message}`);
    }
  }

  // unit-N.json
  for (const f of unitFiles) {
    const full = path.join(ROOT, f);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (e) {
      err(f, `invalid JSON: ${e.message}`);
      continue;
    }
    validateUnit(f, data);
  }

  // report
  console.log(`\nChecked ${unitFiles.length} unit files + index.json`);
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    warnings.forEach(w => console.log('  ' + w));
  }
  if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    errors.forEach(e => console.log('  ' + e));
    process.exit(1);
  }
  console.log('\n✓ all units valid');
}

main();
