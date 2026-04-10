/**
 * grammar-loader.js — Lazy Unit Loader
 * Lazy unit loader — fetches units on demand from /units/ directory.
 * 
 * On page load: fetches only index.json (7KB — titles & IDs).
 * When a unit is selected: fetches unit-{id}.json (6-13KB each).
 * 
 * Exposes the same `grammarUnits` global that the rest of the app expects,
 * but populated lazily.
 */

const GrammarLoader = {
    indexData: null,      // Array of { id, title, hasContent }
    unitCache: {},        // Loaded units cached by ID
    basePath: 'units/',   // Path to unit JSON files
    _readyCallbacks: [],
    _indexReady: false,

    /**
     * Initialize: load the lightweight index
     */
    async init() {
        try {
            const resp = await fetch(this.basePath + 'index.json');
            if (!resp.ok) throw new Error('Failed to load unit index');
            this.indexData = await resp.json();
            this._indexReady = true;

            // Create a lightweight grammarUnits global for backward compatibility
            // Each entry is a proxy that loads full data on access
            window.grammarUnits = this.indexData.map(entry => ({
                id: entry.id,
                title: entry.title,
                hasContent: entry.hasContent,
                // These will be populated when loadUnit() is called
                sections: null,
                exercises: null,
                _loaded: false
            }));

            // Fire ready callbacks
            this._readyCallbacks.forEach(cb => cb(this.indexData));
            this._readyCallbacks = [];

        } catch (err) {
            console.error('GrammarLoader init failed:', err);
            // No fallback — units are loaded individually via loadUnit()
            window.grammarUnits = [];
        }
    },

    /**
     * Register a callback for when the index is ready
     */
    onReady(callback) {
        if (this._indexReady) {
            callback(this.indexData);
        } else {
            this._readyCallbacks.push(callback);
        }
    },

    /**
     * Load a specific unit's full data (theory + exercises)
     * Returns the unit object or null
     */
    async loadUnit(unitId) {
        unitId = parseInt(unitId);

        // Return from cache if already loaded
        if (this.unitCache[unitId]) {
            return this.unitCache[unitId];
        }

        try {
            const resp = await fetch(`${this.basePath}unit-${unitId}.json`);
            if (!resp.ok) throw new Error(`Unit ${unitId} not found`);
            const unit = await resp.json();

            // Cache it
            this.unitCache[unitId] = unit;

            // Also update the global grammarUnits array for backward compatibility
            if (window.grammarUnits) {
                const idx = window.grammarUnits.findIndex(u => u.id === unitId);
                if (idx !== -1) {
                    window.grammarUnits[idx] = unit;
                    window.grammarUnits[idx]._loaded = true;
                }
            }

            return unit;
        } catch (err) {
            console.error(`Failed to load unit ${unitId}:`, err);
            return null;
        }
    },

    /**
     * Get unit title without loading full data
     */
    getTitle(unitId) {
        if (!this.indexData) return `Unit ${unitId}`;
        const entry = this.indexData.find(u => u.id === parseInt(unitId));
        return entry ? entry.title : `Unit ${unitId}`;
    },

    /**
     * Get all unit titles (for sidebar, search, etc.)
     */
    getAllTitles() {
        return this.indexData || [];
    },

    /**
     * Check if a unit has real content
     */
    hasContent(unitId) {
        if (!this.indexData) return false;
        const entry = this.indexData.find(u => u.id === parseInt(unitId));
        return entry ? entry.hasContent : false;
    },

    /**
     * Preload adjacent units for smoother navigation
     */
    preloadAdjacent(currentId) {
        currentId = parseInt(currentId);
        // Preload previous and next
        if (currentId > 1) this.loadUnit(currentId - 1);
        if (currentId < 100) this.loadUnit(currentId + 1);
    }
};

// Auto-initialize
GrammarLoader.init();

// Export globally
window.GrammarLoader = GrammarLoader;
