/**
 * Client-side Router
 * Handles page navigation and rendering
 */
class Router {
  constructor() {
    this.routes = new Map();
    this.currentPage = null;
    this.container = null;
    this.beforeHooks = [];
    this.afterHooks = [];
    this.params = {};
    this.query = {};
    
    // Handle browser navigation
    window.addEventListener('popstate', (e) => {
      this.handleNavigation(e.state?.path || window.location.pathname);
    });

    // Handle custom navigate events
    window.addEventListener('navigate', (e) => {
      this.navigate(e.detail.page, e.detail.params, e.detail.query);
    });
  }

  /**
   * Initialize router
   */
  init(container) {
    this.container = container;
    const path = window.location.pathname || '/';
    this.handleNavigation(path);
  }

  /**
   * Register a route
   */
  register(path, component, options = {}) {
    this.routes.set(path, { component, options });
    return this;
  }

  /**
   * Navigate to a page
   */
  navigate(page, params = {}, query = {}) {
    const path = this.buildPath(page, params);
    const url = this.buildUrl(path, query);
    
    window.history.pushState({ path }, '', url);
    this.handleNavigation(path, params, query);
  }

  /**
   * Handle navigation
   */
  async handleNavigation(path, params = {}, query = {}) {
    // Parse query from URL if not provided
    if (!Object.keys(query).length) {
      query = this.parseQuery(window.location.search);
    }

    // Find matching route
    let route = this.routes.get(path);
    let routeParams = params;

    if (!route) {
      // Try pattern matching
      for (const [pattern, routeData] of this.routes) {
        const match = this.matchPattern(pattern, path);
        if (match) {
          route = routeData;
          routeParams = { ...params, ...match };
          break;
        }
      }
    }

    if (!route) {
      // 404
      route = this.routes.get('*') || this.routes.get('/404');
      if (!route) {
        this.render404();
        return;
      }
    }

    this.params = routeParams;
    this.query = query;

    // Run before hooks
    for (const hook of this.beforeHooks) {
      const result = await hook(path, routeParams, query);
      if (result === false) {
        return; // Navigation cancelled
      }
    }

    // Render page
    const { component } = route;
    if (typeof component === 'function') {
      this.currentPage = component;
      await this.render(component, routeParams, query);
    } else if (component && component.render) {
      this.currentPage = component;
      await component.render(routeParams, query);
    }

    // Run after hooks
    for (const hook of this.afterHooks) {
      await hook(path, routeParams, query);
    }
  }

  /**
   * Render a component
   */
  async render(component, params, query) {
    if (!this.container) return;

    // Show loading
    this.container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
      </div>
    `;

    try {
      let html;
      if (typeof component === 'function') {
        html = await component(params, query);
      } else if (component.render) {
        html = await component.render(params, query);
      }

      if (html) {
        this.container.innerHTML = html;
        this.container.scrollTop = 0;
      }
    } catch (error) {
      console.error('Render error:', error);
      this.container.innerHTML = `
        <div class="error-container">
          <h2>Something went wrong</h2>
          <p>${error.message}</p>
          <button onclick="location.reload()">Reload</button>
        </div>
      `;
    }
  }

  /**
   * Render 404 page
   */
  render404() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="error-page">
        <div class="error-content">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>The page you're looking for doesn't exist.</p>
          <button class="btn btn-primary" onclick="window.history.back()">
            Go Back
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Build path from page and params
   */
  buildPath(page, params) {
    let path = page;
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, value);
    }
    return path;
  }

  /**
   * Build URL with query parameters
   */
  buildUrl(path, query = {}) {
    const url = new URL(path, window.location.origin);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    return url.pathname + url.search;
  }

  /**
   * Parse query string
   */
  parseQuery(search) {
    const params = {};
    const url = new URL(search, window.location.origin);
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  /**
   * Match route pattern
   */
  matchPattern(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }

  /**
   * Register navigation hooks
   */
  before(hook) {
    this.beforeHooks.push(hook);
  }

  after(hook) {
    this.afterHooks.push(hook);
  }

  /**
   * Get current route params
   */
  getParams() {
    return this.params;
  }

  /**
   * Get current query params
   */
  getQuery() {
    return this.query;
  }

  /**
   * Get current path
   */
  getPath() {
    return window.location.pathname;
  }
}

// Export singleton
export const Router = new Router();
export default Router;
