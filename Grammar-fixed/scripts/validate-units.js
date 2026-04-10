#!/usr/bin/env node
/**
 * validate-units.js — sanity check for units/*.json
 *
 * Runs with zero dependencies. Exits non-zero if any file is malformed,
 * so you can wire this into CI or a pre-commit hook.
 *
 * Checks:
 *  - JSON parses
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
