/**
 * Application State Management
 * Central store with reactive state
 */
class Store {
  constructor() {
    this.state = {
      user: null,
      chats: [],
      messages: {},
      groups: [],
      channels: [],
      calls: [],
      notifications: [],
      settings: {},
      onlineUsers: new Set(),
      typingUsers: new Map(),
      currentChat: null,
      currentGroup: null,
      currentChannel: null,
      isSidebarOpen: false,
      isDarkTheme: true,
      isLoading: false,
      searchQuery: '',
      searchResults: [],
      unreadCount: 0,
      selectedChats: new Set(),
      drafts: new Map(),
      mediaCache: new Map(),
    };

    this.listeners = new Map();
    this.computed = new Map();
    this.middleware = [];

    // Load persisted state
    this.loadPersisted();
  }

  /**
   * Get state value
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Set state value with reactivity
   */
  set(key, value) {
    const oldValue = this.state[key];
    
    // Run middleware
    for (const middleware of this.middleware) {
      value = middleware(key, value, oldValue) || value;
    }

    this.state[key] = value;
    this.emit(key, value, oldValue);
    this.persist(key, value);
  }

  /**
   * Update multiple state values
   */
  update(updates) {
    const changed = {};
    for (const [key, value] of Object.entries(updates)) {
      const oldValue = this.state[key];
      let newValue = value;

      // Run middleware
      for (const middleware of this.middleware) {
        newValue = middleware(key, newValue, oldValue) || newValue;
      }

      if (newValue !== oldValue) {
        this.state[key] = newValue;
        changed[key] = { old: oldValue, new: newValue };
      }
    }

    // Emit all changes
    for (const [key, change] of Object.entries(changed)) {
      this.emit(key, change.new, change.old);
      this.persist(key, change.new);
    }
  }

  /**
   * Subscribe to state changes
   */
  on(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => this.off(key, callback);
  }

  /**
   * Unsubscribe from state changes
   */
  off(key, callback) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).delete(callback);
    }
  }

  /**
   * Emit state change
   */
  emit(key, value, oldValue) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error(`Error in listener for ${key}:`, error);
        }
      });
    }

    // Emit wildcard listeners
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => {
        try {
          callback(key, value, oldValue);
        } catch (error) {
          console.error('Error in wildcard listener:', error);
        }
      });
    }
  }

  /**
   * Add middleware
   */
  use(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Persist state to localStorage
   */
  persist(key, value) {
    const persistKeys = ['user', 'settings', 'theme', 'drafts'];
    if (persistKeys.includes(key)) {
      try {
        localStorage.setItem(`store_${key}`, JSON.stringify(value));
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Load persisted state
   */
  loadPersisted() {
    const persistKeys = ['user', 'settings', 'theme', 'drafts'];
    for (const key of persistKeys) {
      try {
        const data = localStorage.getItem(`store_${key}`);
        if (data) {
          this.state[key] = JSON.parse(data);
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Clear state
   */
  clear() {
    this.state = {
      user: null,
      chats: [],
      messages: {},
      groups: [],
      channels: [],
      calls: [],
      notifications: [],
      settings: {},
      onlineUsers: new Set(),
      typingUsers: new Map(),
      currentChat: null,
      currentGroup: null,
      currentChannel: null,
      isSidebarOpen: false,
      isDarkTheme: true,
      isLoading: false,
      searchQuery: '',
      searchResults: [],
      unreadCount: 0,
      selectedChats: new Set(),
      drafts: new Map(),
      mediaCache: new Map(),
    };
    this.emit('*', this.state);
  }

  /**
   * Computed properties
   */
  computed(key, fn) {
    this.computed.set(key, fn);
    Object.defineProperty(this.state, key, {
      get: () => fn(this.state),
      enumerable: true,
      configurable: false,
    });
  }

  /**
   * Reset store (logout)
   */
  reset() {
    this.clear();
    // Clear persisted data
    const persistKeys = ['user', 'settings', 'theme', 'drafts'];
    for (const key of persistKeys) {
      try {
        localStorage.removeItem(`store_${key}`);
      } catch {
        // Ignore
      }
    }
  }
}

// Export singleton
export const Store = new Store();
export default Store;
