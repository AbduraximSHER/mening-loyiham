/**
 * features.js — EnglishMaster New Features
 * 1. Dark Mode Toggle
 * 2. Text-to-Speech Pronunciation
 * 3. Daily Challenge / Word of the Day
 */

// ============================================================
// 1. DARK MODE
// ============================================================
const DarkMode = {
    STORAGE_KEY: 'gh_theme', // was 'em_theme' — mismatched with every page's inline reader and ui-extras.js

    init() {
        // Load saved preference or system preference
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (saved === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            // Auto-detect system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        }

        // Inject toggle button if not already present
        if (!document.getElementById('darkModeToggle')) {
            const btn = document.createElement('button');
            btn.id = 'darkModeToggle';
            btn.className = 'dark-mode-toggle';
            btn.setAttribute('aria-label', 'Toggle dark mode');
            btn.innerHTML = `
                <span class="icon-moon">🌙</span>
                <span class="icon-sun">☀️</span>
            `;
            btn.addEventListener('click', () => this.toggle());
            document.body.appendChild(btn);
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                if (e.matches) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                }
            }
        });
    },

    toggle() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem(this.STORAGE_KEY, 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem(this.STORAGE_KEY, 'dark');
        }
    },

    isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }
};


// ============================================================
// 2. TEXT-TO-SPEECH PRONUNCIATION
// ============================================================
const TTS = {
    enabled: true,
    rate: 0.9,
    voice: null,

    init() {
        if (!('speechSynthesis' in window)) {
            console.warn('Text-to-Speech not supported in this browser.');
            this.enabled = false;
            return;
        }

        // Find best English voice
        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            // Prefer British English, then any English
            this.voice = voices.find(v => v.lang === 'en-GB' && v.name.includes('Female'))
                || voices.find(v => v.lang === 'en-GB')
                || voices.find(v => v.lang === 'en-US')
                || voices.find(v => v.lang.startsWith('en'))
                || null;
        };

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }

        // Attach click handlers to all audio buttons + examples
        this._attachListeners();
    },

    speak(text) {
        if (!text) return;
        
        const clean = text
            .replace(/<[^>]*>/g, '')
            .replace(/•\s*/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!clean) return;

        // Method 1: Try Dictionary API for real pronunciation
        this._tryDictionaryAudio(clean)
            .then(played => {
                if (!played) {
                    // Method 2: Google Translate TTS (works everywhere)
                    this._playGoogleTTS(clean);
                }
            })
            .catch(() => {
                this._playGoogleTTS(clean);
            });
    },

    async _tryDictionaryAudio(word) {
        // Only works for single words
        if (word.includes(' ')) return false;
        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            if (!res.ok) return false;
            const data = await res.json();
            const phonetic = data[0]?.phonetics?.find(p => p.audio && p.audio.length > 0);
            if (phonetic?.audio) {
                const audio = new Audio(phonetic.audio);
                audio.play();
                return true;
            }
            return false;
        } catch { return false; }
    },

    _playGoogleTTS(text) {
        // Google Translate TTS - works on all browsers
        const encoded = encodeURIComponent(text.substring(0, 200));
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encoded}`;
        const audio = new Audio(url);
        audio.play().catch(() => {
            // If Google TTS blocked, try speechSynthesis as last resort
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                speechSynthesis.speak(utterance);
            }
        });
    },

    _attachListeners() {
        // Attach to existing audio buttons
        document.querySelectorAll('.audio-btn').forEach(btn => {
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const example = btn.closest('.web-example');
                if (example) {
                    const textEl = example.querySelector('span');
                    if (textEl) this.speak(textEl.textContent);
                }
            });
        });

        // Make all example sentences speakable on click
        document.querySelectorAll('.web-example span').forEach(span => {
            span.style.cursor = 'pointer';
            span.title = 'Click to hear pronunciation';
            span.addEventListener('click', () => {
                this.speak(span.textContent);
                // Visual feedback
                span.style.transition = 'color 0.3s';
                span.style.color = 'var(--primary)';
                setTimeout(() => { span.style.color = ''; }, 1500);
            });
        });
    }
};


// ============================================================
// 3. DAILY CHALLENGE / WORD OF THE DAY
// ============================================================
const DailyChallenge = {
    STORAGE_KEY: 'em_daily_challenge',

    // Curated word bank — expand as needed
    words: [
        { word: "ubiquitous", definition: "Found everywhere; very widespread", example: "Smartphones have become ubiquitous in modern life.", level: "C1" },
        { word: "ephemeral", definition: "Lasting for a very short time", example: "The ephemeral beauty of cherry blossoms makes them special.", level: "C2" },
        { word: "pragmatic", definition: "Dealing with things practically rather than ideally", example: "We need a pragmatic approach to solve this problem.", level: "C1" },
        { word: "ambiguous", definition: "Open to more than one interpretation; unclear", example: "His response was deliberately ambiguous.", level: "B2" },
        { word: "meticulous", definition: "Showing great attention to detail; very careful", example: "She is meticulous about keeping accurate records.", level: "C1" },
        { word: "resilient", definition: "Able to recover quickly from difficulties", example: "Children are often more resilient than adults give them credit for.", level: "B2" },
        { word: "eloquent", definition: "Fluent and persuasive in speaking or writing", example: "She gave an eloquent speech about climate change.", level: "C1" },
        { word: "candid", definition: "Truthful and straightforward; frank", example: "I appreciate your candid feedback on my essay.", level: "C1" },
        { word: "diligent", definition: "Having or showing care in one's work", example: "Diligent students tend to achieve their goals.", level: "B2" },
        { word: "nuance", definition: "A subtle difference in meaning or expression", example: "There's an important nuance between 'must' and 'have to'.", level: "C1" },
        { word: "concise", definition: "Giving a lot of information clearly in a few words", example: "Your essay should be concise and well-structured.", level: "B2" },
        { word: "paradox", definition: "A statement that seems contradictory but may be true", example: "It's a paradox that standing is more tiring than walking.", level: "C1" },
        { word: "inevitable", definition: "Certain to happen; unavoidable", example: "Change is inevitable in any growing organisation.", level: "B2" },
        { word: "scrutinize", definition: "To examine or inspect closely and thoroughly", example: "The committee will scrutinize every detail of the report.", level: "C1" },
        { word: "alleviate", definition: "To make suffering or a problem less severe", example: "This medication should alleviate the pain.", level: "C1" },
        { word: "hypothetical", definition: "Based on a suggested idea, not reality", example: "Let's consider a hypothetical situation.", level: "B2" },
        { word: "arbitrary", definition: "Based on random choice rather than reason", example: "The decision seemed completely arbitrary.", level: "C1" },
        { word: "comprehensive", definition: "Including all or nearly all aspects of something", example: "We need a comprehensive review of the entire system.", level: "B2" },
        { word: "deteriorate", definition: "To become progressively worse", example: "His health continued to deteriorate.", level: "C1" },
        { word: "subsequent", definition: "Coming after something in time; following", example: "Subsequent events proved her right.", level: "B2" },
        { word: "tenacious", definition: "Holding firmly to something; persistent", example: "She was tenacious in her pursuit of justice.", level: "C2" },
        { word: "gregarious", definition: "Fond of company; sociable", example: "He's a gregarious person who loves parties.", level: "C2" },
        { word: "exacerbate", definition: "To make a bad situation even worse", example: "The drought was exacerbated by high temperatures.", level: "C1" },
        { word: "prevalent", definition: "Widespread in a particular area or time", example: "This disease is more prevalent in tropical regions.", level: "B2" },
        { word: "fluctuate", definition: "To rise and fall irregularly", example: "Prices tend to fluctuate throughout the year.", level: "B2" },
        { word: "indigenous", definition: "Originating or occurring naturally in a place", example: "These plants are indigenous to South America.", level: "C1" },
        { word: "mitigate", definition: "To make less severe or serious", example: "We took steps to mitigate the damage.", level: "C1" },
        { word: "substantiate", definition: "To provide evidence to support a claim", example: "Can you substantiate your accusations?", level: "C2" },
        { word: "precarious", definition: "Not secure; dependent on chance", example: "He made a precarious living as a freelance writer.", level: "C1" },
        { word: "unprecedented", definition: "Never done or known before", example: "The pandemic created unprecedented challenges.", level: "B2" },
        { word: "notorious", definition: "Famous for something bad", example: "The city is notorious for its traffic jams.", level: "B2" },
        { word: "subtle", definition: "Fine or delicate; not obvious", example: "There's a subtle difference between the two words.", level: "B2" },
        { word: "compelling", definition: "Evoking interest or attention in a powerfully irresistible way", example: "She made a compelling argument for change.", level: "C1" },
        { word: "mundane", definition: "Lacking interest or excitement; dull", example: "He wanted to escape the mundane routine of office life.", level: "C1" },
        { word: "prolific", definition: "Producing much fruit, foliage, or many offspring", example: "She is a prolific writer with over 30 published novels.", level: "C1" },
        { word: "detrimental", definition: "Tending to cause harm", example: "Smoking is detrimental to your health.", level: "B2" },
        { word: "obsolete", definition: "No longer produced or used; out of date", example: "Typewriters have become obsolete.", level: "B2" },
        { word: "lucrative", definition: "Producing a great deal of profit", example: "The tech industry offers many lucrative career opportunities.", level: "C1" },
        { word: "versatile", definition: "Able to adapt to many different functions", example: "She's a versatile actress who can play any role.", level: "B2" },
        { word: "aesthetic", definition: "Concerned with beauty or the appreciation of beauty", example: "The building has great aesthetic appeal.", level: "C1" },
        { word: "authentic", definition: "Of undisputed origin; genuine", example: "This is an authentic Italian recipe.", level: "B2" },
        { word: "benevolent", definition: "Well-meaning and kindly", example: "The benevolent teacher helped every struggling student.", level: "C1" },
        { word: "contemplate", definition: "To think deeply about something", example: "She sat by the window contemplating her future.", level: "B2" },
        { word: "deficient", definition: "Not having enough of a specified quality", example: "His diet is deficient in vitamins.", level: "C1" },
        { word: "elaborate", definition: "Involving many carefully arranged parts; detailed", example: "She gave an elaborate explanation of the theory.", level: "B2" },
        { word: "feasible", definition: "Possible to do easily or conveniently", example: "Is it feasible to complete the project by Friday?", level: "C1" },
        { word: "gratitude", definition: "The quality of being thankful", example: "She expressed her gratitude with a heartfelt letter.", level: "B2" },
        { word: "hierarchy", definition: "A system of ranking one above another", example: "The company has a strict management hierarchy.", level: "C1" },
        { word: "impartial", definition: "Treating all rivals or disputants equally; fair", example: "A judge must remain impartial throughout the trial.", level: "C1" },
        { word: "jeopardize", definition: "To put something at risk of being lost or harmed", example: "Don't jeopardize your career over a small mistake.", level: "C1" },
        { word: "keen", definition: "Eager or enthusiastic", example: "She's very keen on learning new languages.", level: "B2" },
        { word: "legitimate", definition: "Conforming to the law or to rules", example: "He has a legitimate reason for being absent.", level: "B2" },
        { word: "mediocre", definition: "Of only average quality; not very good", example: "The restaurant was mediocre at best.", level: "C1" },
        { word: "negligible", definition: "So small or unimportant as to be not worth considering", example: "The difference in price is negligible.", level: "C1" },
        { word: "optimistic", definition: "Hopeful and confident about the future", example: "She remains optimistic despite the challenges.", level: "B2" },
        { word: "profound", definition: "Very great or intense; deep", example: "The book had a profound effect on my thinking.", level: "C1" },
        { word: "reluctant", definition: "Unwilling and hesitant", example: "He was reluctant to admit his mistake.", level: "B2" },
        { word: "stimulate", definition: "To raise levels of activity; encourage", example: "The government wants to stimulate economic growth.", level: "B2" },
        { word: "trivial", definition: "Of little value or importance", example: "Don't waste time on trivial matters.", level: "B2" },
        { word: "undermine", definition: "To weaken or damage gradually", example: "His constant criticism undermined her confidence.", level: "C1" },
        { word: "volatile", definition: "Liable to change rapidly and unpredictably", example: "The stock market has been very volatile recently.", level: "C1" },
        { word: "wholesome", definition: "Conducive to good health and well-being", example: "They enjoy wholesome outdoor activities as a family.", level: "B2" },
        { word: "zealous", definition: "Having great energy or enthusiasm for a cause", example: "She is a zealous advocate for animal rights.", level: "C2" },
        { word: "abundant", definition: "Existing in very large quantities; plentiful", example: "The region has abundant natural resources.", level: "B2" },
        { word: "benchmark", definition: "A standard or point of reference for comparison", example: "This score will serve as a benchmark for future tests.", level: "C1" },
        { word: "credible", definition: "Able to be believed; convincing", example: "Is there a credible source for this information?", level: "B2" },
        { word: "daunting", definition: "Seeming difficult to deal with; intimidating", example: "Moving to a new country can be a daunting experience.", level: "B2" },
        { word: "empathy", definition: "The ability to understand another person's feelings", example: "A good doctor shows empathy towards patients.", level: "B2" },
        { word: "facade", definition: "A deceptive outward appearance", example: "Behind his cheerful facade, he was deeply unhappy.", level: "C1" },
    ],

    // Grammar challenges
    grammarChallenges: [
        { question: "Choose the correct form: 'If I ___ you, I would apologize.'", options: ["was", "were", "am", "be"], correct: 1, explanation: "In second conditional (unreal present), we use 'were' for all subjects." },
        { question: "'By next year, she ___ here for a decade.'", options: ["will work", "will have worked", "will be working", "works"], correct: 1, explanation: "Future perfect ('will have worked') describes an action completed before a future time." },
        { question: "'I wish I ___ harder for the exam.'", options: ["study", "studied", "had studied", "would study"], correct: 2, explanation: "Past perfect after 'wish' expresses regret about a past action." },
        { question: "'Not until the rain stopped ___ leave the building.'", options: ["we could", "could we", "we can", "can we"], correct: 1, explanation: "Inversion is required after negative adverbials like 'Not until...'." },
        { question: "'She denied ___ the money.'", options: ["to take", "taking", "take", "took"], correct: 1, explanation: "'Deny' is followed by -ing form, not infinitive." },
        { question: "'The report, ___ was published yesterday, is very detailed.'", options: ["that", "which", "what", "who"], correct: 1, explanation: "Non-defining relative clauses use 'which' (not 'that') for things." },
        { question: "'Hardly ___ arrived when the meeting started.'", options: ["I had", "had I", "I have", "have I"], correct: 1, explanation: "Inversion after 'Hardly' — auxiliary before subject." },
        { question: "'She suggested that he ___ a doctor.'", options: ["sees", "see", "saw", "would see"], correct: 1, explanation: "Subjunctive after 'suggest that' — use base form of verb." },
        { question: "'It's high time you ___ looking for a job.'", options: ["start", "started", "had started", "would start"], correct: 1, explanation: "'It's high time' is followed by past simple to talk about present/future." },
        { question: "'No sooner had she left ___ it started raining.'", options: ["when", "than", "that", "as"], correct: 1, explanation: "'No sooner... than' is the correct correlative pattern." },
    ],

    getTodaysChallenge() {
        const today = new Date().toISOString().split('T')[0];
        
        // --- Smart word selection: no repeats until all seen ---
        let history = JSON.parse(localStorage.getItem('em_word_history') || '{}');
        let seenWords = history.seen || [];
        let lastDate = history.lastDate || '';
        let todayWord = history.todayWord || null;
        
        // If already picked a word today, reuse it
        if (lastDate === today && todayWord !== null) {
            // Use saved word index
        } else {
            // Get unseen words
            let unseenIndices = [];
            for (let i = 0; i < this.words.length; i++) {
                if (!seenWords.includes(i)) unseenIndices.push(i);
            }
            
            // If all words seen, reset
            if (unseenIndices.length === 0) {
                seenWords = [];
                unseenIndices = this.words.map((_, i) => i);
            }
            
            // Pick random unseen word
            const randomIdx = unseenIndices[Math.floor(Math.random() * unseenIndices.length)];
            todayWord = randomIdx;
            seenWords.push(randomIdx);
            
            // Save
            localStorage.setItem('em_word_history', JSON.stringify({
                seen: seenWords,
                lastDate: today,
                todayWord: todayWord
            }));
        }
        
        // --- Smart grammar selection: same approach ---
        let gHistory = JSON.parse(localStorage.getItem('em_grammar_history') || '{}');
        let seenGrammar = gHistory.seen || [];
        let gLastDate = gHistory.lastDate || '';
        let todayGrammar = gHistory.todayGrammar || null;
        
        if (gLastDate === today && todayGrammar !== null) {
            // Reuse
        } else {
            let unseenG = [];
            for (let i = 0; i < this.grammarChallenges.length; i++) {
                if (!seenGrammar.includes(i)) unseenG.push(i);
            }
            if (unseenG.length === 0) {
                seenGrammar = [];
                unseenG = this.grammarChallenges.map((_, i) => i);
            }
            todayGrammar = unseenG[Math.floor(Math.random() * unseenG.length)];
            seenGrammar.push(todayGrammar);
            localStorage.setItem('em_grammar_history', JSON.stringify({
                seen: seenGrammar,
                lastDate: today,
                todayGrammar: todayGrammar
            }));
        }

        return {
            date: today,
            word: this.words[todayWord] || this.words[0],
            grammar: this.grammarChallenges[todayGrammar] || this.grammarChallenges[0]
        };
    },

    isCompletedToday() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (!saved) return { word: false, grammar: false };
        try {
            const data = JSON.parse(saved);
            const today = new Date().toISOString().split('T')[0];
            return {
                word: data.wordDate === today,
                grammar: data.grammarDate === today && data.grammarAnswer !== undefined
            };
        } catch { return { word: false, grammar: false }; }
    },

    markWordSeen() {
        const today = new Date().toISOString().split('T')[0];
        const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        saved.wordDate = today;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saved));
    },

    markGrammarAnswered(answerIndex) {
        const today = new Date().toISOString().split('T')[0];
        const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        saved.grammarDate = today;
        saved.grammarAnswer = answerIndex;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saved));
    },

    /**
     * Render Daily Challenge widget into a container element
     * @param {HTMLElement} container 
     */
    render(container) {
        if (!container) return;

        const challenge = this.getTodaysChallenge();
        const completed = this.isCompletedToday();

        container.innerHTML = `
            <div class="daily-challenge-widget" style="
                background: linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(245, 158, 11, 0.06));
                border: 1px solid var(--border, #e2e8f0);
                border-radius: 16px;
                padding: 1.5rem;
                margin: 1.5rem 0;
            ">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3 style="margin:0; font-size:1.15rem; color:var(--primary, #E8573A);">
                        ✨ Daily Challenge
                    </h3>
                    <span style="font-size:0.8rem; color:var(--text-light, #78716C); background:var(--bg, #f0fdfa); padding:4px 10px; border-radius:20px;">
                        ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                </div>

                <!-- Word of the Day -->
                <div style="
                    background: var(--surface, white);
                    border-radius: 12px;
                    padding: 1.25rem;
                    margin-bottom: 1rem;
                    border: 1px solid var(--border, #e2e8f0);
                ">
                    <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--accent, #f59e0b); font-weight:600; margin-bottom:0.5rem;">
                        Word of the Day
                    </div>
                    <div style="display:flex; align-items:baseline; gap:0.75rem; flex-wrap:wrap;">
                        <span style="font-size:1.5rem; font-weight:700; color:var(--text-heading, #1e293b);">
                            ${challenge.word.word}
                        </span>
                        <span style="font-size:0.8rem; background:var(--primary-light, #FDECE8); color:var(--primary-dark, #C9422A); padding:2px 8px; border-radius:12px; font-weight:500;">
                            ${challenge.word.level}
                        </span>
                        <button onclick="TTS.speak(this.dataset.word)" data-word="${challenge.word.word}" style="
                            background:none; border:1px solid var(--border, #e2e8f0); border-radius:50%;
                            width:28px; height:28px; cursor:pointer; display:inline-flex;
                            align-items:center; justify-content:center; font-size:14px;
                            color:var(--primary, #E8573A);
                        " title="Listen to pronunciation">🔊</button>
                    </div>
                    <p style="margin:0.5rem 0 0; color:var(--text-main, #334155); font-size:0.95rem;">
                        ${challenge.word.definition}
                    </p>
                    <p style="margin:0.75rem 0 0; color:var(--text-light, #78716C); font-size:0.9rem; font-style:italic; border-left:3px solid var(--primary, #E8573A); padding-left:0.75rem;">
                        "${challenge.word.example}"
                    </p>
                </div>

                <!-- Grammar Challenge -->
                <div style="
                    background: var(--surface, white);
                    border-radius: 12px;
                    padding: 1.25rem;
                    border: 1px solid var(--border, #e2e8f0);
                ">
                    <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--primary, #E8573A); font-weight:600; margin-bottom:0.5rem;">
                        Grammar Challenge
                    </div>
                    <p style="font-weight:500; margin-bottom:1rem; color:var(--text-heading, #1e293b); font-size:0.95rem;">
                        ${challenge.grammar.question}
                    </p>
                    <div id="daily-grammar-options" style="display:grid; gap:0.5rem;">
                        ${challenge.grammar.options.map((opt, i) => `
                            <button class="daily-grammar-opt" data-index="${i}" ${completed.grammar ? 'disabled' : ''} style="
                                text-align:left; padding:0.7rem 1rem; border:1px solid var(--border, #e2e8f0);
                                border-radius:8px; cursor:${completed.grammar ? 'default' : 'pointer'};
                                background:${completed.grammar ? (i === challenge.grammar.correct ? 'rgba(16,185,129,0.1)' : 'var(--surface, white)') : 'var(--surface, white)'};
                                color:var(--text-main, #334155); font-size:0.9rem;
                                font-family:inherit; transition:all 0.2s;
                                ${completed.grammar && i === challenge.grammar.correct ? 'border-color:var(--success, #10b981); font-weight:600;' : ''}
                            ">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                    <div id="daily-grammar-feedback" style="margin-top:0.75rem; font-size:0.9rem; display:${completed.grammar ? 'block' : 'none'}; color:var(--text-main, #334155); padding:0.75rem; background:rgba(15,118,110,0.05); border-radius:8px;">
                        ${completed.grammar ? challenge.grammar.explanation : ''}
                    </div>
                </div>
            </div>
        `;

        // Attach click handlers to grammar options
        if (!completed.grammar) {
            container.querySelectorAll('.daily-grammar-opt').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    const isCorrect = index === challenge.grammar.correct;

                    // Disable all buttons
                    container.querySelectorAll('.daily-grammar-opt').forEach(b => {
                        b.disabled = true;
                        b.style.cursor = 'default';
                        if (parseInt(b.dataset.index) === challenge.grammar.correct) {
                            b.style.background = 'rgba(16,185,129,0.1)';
                            b.style.borderColor = 'var(--success, #10b981)';
                            b.style.fontWeight = '600';
                        }
                    });

                    if (!isCorrect) {
                        btn.style.background = 'rgba(239,68,68,0.1)';
                        btn.style.borderColor = 'var(--error, #ef4444)';
                    }

                    // Show feedback
                    const feedback = container.querySelector('#daily-grammar-feedback');
                    feedback.style.display = 'block';
                    feedback.textContent = challenge.grammar.explanation;

                    // Save
                    this.markGrammarAnswered(index);
                    this.markWordSeen();

                    // Award points
                    if (isCorrect && typeof Gamification !== 'undefined') {
                        Gamification.addPoints(15, 'Daily Challenge');
                    } else if (typeof Gamification !== 'undefined') {
                        Gamification.addPoints(5, 'Daily Challenge attempt');
                    }
                });
            });
        }
    }
};


// ============================================================
// AUTO-INIT ON LOAD
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dark mode (works on all pages)
    DarkMode.init();

    // Initialize TTS on all pages (needed for Daily Challenge audio too)
    TTS.init();

    // Render daily challenge if container exists (dashboard page)
    const challengeContainer = document.getElementById('daily-challenge-container');
    if (challengeContainer) {
        DailyChallenge.render(challengeContainer);
    }
});

// Export for use in other scripts
window.DarkMode = DarkMode;
window.TTS = TTS;
window.DailyChallenge = DailyChallenge;
