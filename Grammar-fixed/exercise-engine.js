/**
 * exercise-engine.js — unified exercise renderer
 *
 * One entry point, four exercise types. Designed to be a drop-in for the
 * existing MCQ-only exercise code: existing unit JSONs work unchanged because
 * "no type field" is treated as "mcq".
 *
 * Usage:
 *   ExerciseEngine.render(exercise, container, (result) => {
 *     // result = { correct: bool, userAnswer: string, timeSpentMs: int }
 *     Gamification?.recordAnswer(result);
 *   });
 *
 * Supported exercise shapes:
 *
 *   MCQ (default)
 *     { question, options: [...], correctAnswer: <index>, hint?, explanation? }
 *
 *   Fill-in-the-blank
 *     { type:"fill", question:"I ___ to school", answer:"go",
 *       acceptable?:["walk","went"], hint?, explanation? }
 *
 *   Reorder tokens
 *     { type:"reorder", prompt:"Make a sentence",
 *       tokens:["to","I","school","go"], correctOrder:[1,3,0,2],
 *       hint?, explanation? }
 *
 *   Error correction
 *     { type:"correct", sentence:"He go to school every day",
 *       correction:"He goes to school every day",
 *       acceptable?:[...], hint?, explanation? }
 *
 * Accessibility:
 *   - All interactive elements are real <button>s or <input>s
 *   - aria-live region announces feedback
 *   - Focus is moved to the feedback after answering
 *   - Keyboard: Tab through options, Enter/Space to activate, arrows for reorder
 */

(function (global) {
  'use strict';

  const ExerciseEngine = {
    render(exercise, container, onResult) {
      if (!container) throw new Error('[ExerciseEngine] container required');
      container.innerHTML = '';
      container.classList.add('ex-root');

      const type = exercise.type || 'mcq';
      const startedAt = performance.now();

      const finish = (correct, userAnswer) => {
        onResult && onResult({
          correct,
          userAnswer,
          timeSpentMs: Math.round(performance.now() - startedAt)
        });
      };

      switch (type) {
        case 'mcq':     return renderMCQ(exercise, container, finish);
        case 'fill':    return renderFill(exercise, container, finish);
        case 'reorder': return renderReorder(exercise, container, finish);
        case 'correct': return renderCorrect(exercise, container, finish);
        default:
          container.textContent = `Unknown exercise type: ${type}`;
      }
    }
  };

  // ─── shared helpers ────────────────────────────────────────────────────
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'disabled') node.disabled = !!v;  // boolean IDL property, not attribute
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function')
        node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v);
    }
    for (const c of children) {
      if (c == null) continue;
      node.append(c instanceof Node ? c : document.createTextNode(c));
    }
    return node;
  }

  function normalize(str) {
    return (str || '').trim().toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,!?;:]/g, '');
  }

  function feedbackArea(container) {
    const wrap = el('div', {
      class: 'ex-feedback',
      role: 'status',
      'aria-live': 'polite',
      tabindex: '-1'
    });
    container.appendChild(wrap);
    return wrap;
  }

  function showFeedback(fbNode, correct, explanation) {
    fbNode.classList.add(correct ? 'is-correct' : 'is-wrong');
    fbNode.innerHTML =
      `<div class="ex-fb-head">${correct ? '✓ Correct' : '✗ Not quite'}</div>` +
      (explanation ? `<div class="ex-fb-body">${explanation}</div>` : '');
    fbNode.focus();
  }

  // ─── MCQ ───────────────────────────────────────────────────────────────
  function renderMCQ(ex, container, finish) {
    container.appendChild(el('div', { class: 'ex-question', html: ex.question }));
    const list = el('div', { class: 'ex-options', role: 'radiogroup',
                             'aria-label': 'Answer choices' });
    const fb = feedbackArea(container);
    let answered = false;

    ex.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx); // A, B, C, D…

      // Inner layout: letter badge | text | check mark
      const inner = el('div', { class: 'ex-opt-inner' });
      inner.appendChild(el('span', { class: 'ex-opt-letter' }, letter));
      inner.appendChild(el('span', {}, opt));
      const check = el('span', { class: 'ex-opt-check' });
      inner.appendChild(check);

      const btn = el('button', {
        type: 'button',
        class: 'ex-opt',
        role: 'radio',
        'aria-checked': 'false',
        onClick: () => {
          if (answered) return;
          answered = true;
          const correct = idx === ex.correctAnswer;
          btn.classList.add(correct ? 'is-correct' : 'is-wrong');
          check.textContent = correct ? '✓' : '✗';
          btn.setAttribute('aria-checked', 'true');
          if (!correct) {
            const right = list.children[ex.correctAnswer];
            if (right) {
              right.classList.add('is-correct');
              const rc = right.querySelector('.ex-opt-check');
              if (rc) rc.textContent = '✓';
            }
          }
          // Disable + dim all options
          [...list.children].forEach(c => c.setAttribute('aria-disabled','true'));
          showFeedback(fb, correct, ex.explanation);
          finish(correct, opt);
        }
      });
      btn.appendChild(inner);
      list.appendChild(btn);
    });

    container.appendChild(list);
    if (ex.hint) container.appendChild(hintNode(ex.hint));
  }

  // ─── Fill-in-the-blank ─────────────────────────────────────────────────
  function renderFill(ex, container, finish) {
    // Split question at "___" and put an input in its place
    const parts = ex.question.split('___');
    const wrap = el('div', { class: 'ex-question ex-fill-q' });
    const input = el('input', {
      type: 'text',
      class: 'ex-fill-input',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': 'Fill in the blank'
    });

    parts.forEach((part, i) => {
      wrap.appendChild(document.createTextNode(part));
      if (i < parts.length - 1) wrap.appendChild(input); // handles multiple ___ by reusing input visually only for first; rare.
    });
    container.appendChild(wrap);

    const submit = el('button', {
      type: 'button',
      class: 'ex-submit',
      onClick: check
    }, 'Check');
    container.appendChild(submit);

    const fb = feedbackArea(container);
    let answered = false;

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); check(); }
    });
    setTimeout(() => input.focus(), 0);

    function check() {
      if (answered) return;
      const user = input.value;
      const acceptable = [ex.answer, ...(ex.acceptable || [])].map(normalize);
      const correct = acceptable.includes(normalize(user));
      answered = true;
      input.disabled = true;
      submit.disabled = true;
      input.classList.add(correct ? 'is-correct' : 'is-wrong');
      showFeedback(fb, correct,
        correct ? ex.explanation : `Expected: <strong>${ex.answer}</strong>${ex.explanation ? '<br>' + ex.explanation : ''}`
      );
      finish(correct, user);
    }

    if (ex.hint) container.appendChild(hintNode(ex.hint));
  }

  // ─── Reorder tokens ────────────────────────────────────────────────────
  function renderReorder(ex, container, finish) {
    container.appendChild(el('div', { class: 'ex-question', html: ex.prompt }));

    const bank = el('div', { class: 'ex-bank',     'aria-label': 'Word bank' });
    const slot = el('div', { class: 'ex-slot',     'aria-label': 'Your answer', role: 'list' });
    container.appendChild(slot);
    container.appendChild(bank);

    const submit = el('button', {
      type: 'button', class: 'ex-submit', disabled: true, onClick: check
    }, 'Check');
    container.appendChild(submit);

    const fb = feedbackArea(container);
    let answered = false;

    // Shuffle a copy so starting order isn't the answer
    const shuffled = ex.tokens
      .map((t, i) => ({ t, i }))
      .sort(() => Math.random() - 0.5);

    shuffled.forEach(({ t, i }) => {
      bank.appendChild(makeToken(t, i, 'bank'));
    });

    function makeToken(text, origIdx, where) {
      return el('button', {
        type: 'button',
        class: 'ex-token',
        'data-idx': origIdx,
        'data-where': where,
        onClick: (e) => moveToken(e.currentTarget)
      }, text);
    }

    function moveToken(tok) {
      if (answered) return;
      const where = tok.getAttribute('data-where');
      if (where === 'bank') {
        tok.setAttribute('data-where', 'slot');
        slot.appendChild(tok);
      } else {
        tok.setAttribute('data-where', 'bank');
        bank.appendChild(tok);
      }
      submit.disabled = slot.children.length !== ex.tokens.length;
    }

    function check() {
      if (answered) return;
      const userOrder = [...slot.children].map(n => +n.getAttribute('data-idx'));
      const correct = userOrder.every((v, k) => v === ex.correctOrder[k]);
      answered = true;
      submit.disabled = true;
      [...slot.children, ...bank.children].forEach(n => n.disabled = true);
      slot.classList.add(correct ? 'is-correct' : 'is-wrong');
      const correctSentence = ex.correctOrder.map(i => ex.tokens[i]).join(' ');
      showFeedback(fb, correct,
        correct ? ex.explanation
                : `Correct order: <strong>${correctSentence}</strong>${ex.explanation ? '<br>' + ex.explanation : ''}`
      );
      finish(correct, userOrder.map(i => ex.tokens[i]).join(' '));
    }

    if (ex.hint) container.appendChild(hintNode(ex.hint));
  }

  // ─── Error correction ──────────────────────────────────────────────────
  function renderCorrect(ex, container, finish) {
    container.appendChild(el('div', { class: 'ex-question' },
      ex.prompt || 'Rewrite this sentence correctly:'));
    container.appendChild(el('div', { class: 'ex-sentence' }, ex.sentence));

    const input = el('textarea', {
      class: 'ex-correct-input',
      rows: '2',
      'aria-label': 'Corrected sentence',
      autocomplete: 'off',
      autocapitalize: 'sentences',
      spellcheck: 'false'
    });
    container.appendChild(input);

    const submit = el('button', { type: 'button', class: 'ex-submit', onClick: check }, 'Check');
    container.appendChild(submit);

    const fb = feedbackArea(container);
    let answered = false;

    setTimeout(() => input.focus(), 0);

    function check() {
      if (answered) return;
      const user = input.value;
      const acceptable = [ex.correction, ...(ex.acceptable || [])].map(normalize);
      const correct = acceptable.includes(normalize(user));
      answered = true;
      input.disabled = true;
      submit.disabled = true;
      input.classList.add(correct ? 'is-correct' : 'is-wrong');
      showFeedback(fb, correct,
        correct ? ex.explanation
                : `Expected: <strong>${ex.correction}</strong>${ex.explanation ? '<br>' + ex.explanation : ''}`
      );
      finish(correct, user);
    }

    if (ex.hint) container.appendChild(hintNode(ex.hint));
  }

  // ─── hint ──────────────────────────────────────────────────────────────
  function hintNode(text) {
    const wrap = el('details', { class: 'ex-hint' });
    wrap.appendChild(el('summary', {}, 'Need a hint?'));
    wrap.appendChild(el('div', { html: text }));
    return wrap;
  }

  global.ExerciseEngine = ExerciseEngine;
})(window);
