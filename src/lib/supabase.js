class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.selectColumns = '*';
    this.filters = [];
    this.orderConfig = null;
    this.limitVal = null;
    this.isSingle = false;
    // Mirrors the real Supabase client: .update()/.delete()/.insert()/
    // .upsert() only record what to do and return `this` so filters like
    // .eq(...) chained afterwards (the normal call order — e.g.
    // `.update(payload).eq('id', x)`) still land on the request before it
    // fires. The actual fetch only happens once the builder is awaited,
    // via `then()`. Executing eagerly here previously meant `.eq()` was
    // chained onto an already-in-flight (or already-resolved) Promise
    // instead of the builder, so the filter was silently dropped — every
    // update/delete ran against the whole table instead of one row.
    this.method = 'GET';
    this.pendingBody = null;
  }

  select(columns = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(field, value) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  in(field, values) {
    this.filters.push({ type: 'in', field, values });
    return this;
  }

  lte(field, value) {
    this.filters.push({ type: 'lte', field, value });
    return this;
  }

  order(field, options = {}) {
    const ascending = options.ascending !== false;
    this.orderConfig = { field, ascending };
    return this;
  }

  limit(value) {
    this.limitVal = value;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async getRequestHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('oa_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed && parsed.access_token) {
            headers['Authorization'] = `Bearer ${parsed.access_token}`;
          }
        } catch (e) {}
      }
    }
    return headers;
  }

  async execute() {
    const params = new URLSearchParams({
      table: this.table,
      select: this.selectColumns
    });
    if (this.filters.length > 0) {
      params.set('filters', JSON.stringify(this.filters));
    }
    if (this.orderConfig) {
      params.set('order', JSON.stringify(this.orderConfig));
    }
    if (this.limitVal) {
      params.set('limit', String(this.limitVal));
    }

    const headers = await this.getRequestHeaders();
    const options = {
      method: this.method,
      headers
    };
    let body = null;
    if (this.method === 'PUT') {
      body = { payload: this.pendingBody, filters: this.filters };
    } else if (this.method === 'DELETE') {
      body = { filters: this.filters };
    } else if (this.method === 'POST') {
      body = this.pendingBody;
    }
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`/api/db?${params.toString()}`, options);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { data: null, error: new Error(errData.message || 'API Error') };
    }

    const result = await response.json();
    let data = result.data;
    if (this.isSingle && Array.isArray(data)) {
      data = data[0] || null;
    }
    return { data, error: null };
  }

  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }

  insert(payload) {
    this.method = 'POST';
    this.pendingBody = payload;
    return this;
  }

  update(payload) {
    this.method = 'PUT';
    this.pendingBody = payload;
    return this;
  }

  delete() {
    this.method = 'DELETE';
    return this;
  }

  upsert(payload) {
    this.method = 'POST';
    this.pendingBody = { ...payload, __upsert: true };
    return this;
  }
}

const authListeners = new Set();

export const supabase = {
  from(table) {
    return new QueryBuilder(table);
  },

  auth: {
    async getSession() {
      if (typeof window === 'undefined') return { data: { session: null }, error: null };
      const sessionStr = localStorage.getItem('oa_session');
      if (!sessionStr) return { data: { session: null }, error: null };
      try {
        const session = JSON.parse(sessionStr);
        const [, payloadStr] = session.access_token.split('.');
        const payload = JSON.parse(atob(payloadStr));
        if (Date.now() > payload.exp) {
          localStorage.removeItem('oa_session');
          return { data: { session: null }, error: null };
        }
        return { data: { session }, error: null };
      } catch (e) {
        return { data: { session: null }, error: null };
      }
    },

    onAuthStateChange(callback) {
      authListeners.add(callback);
      this.getSession().then(({ data: { session } }) => {
        callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      });

      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            }
          }
        }
      };
    },

    async signInWithPassword({ email, password }) {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return { data: null, error: new Error(errData.message || 'Login failed') };
      }

      const data = await response.json();
      localStorage.setItem('oa_session', JSON.stringify(data.session));
      authListeners.forEach(listener => listener('SIGNED_IN', data.session));

      return { data, error: null };
    },

    async signOut() {
      localStorage.removeItem('oa_session');
      authListeners.forEach(listener => listener('SIGNED_OUT', null));
      return { error: null };
    }
  },

  storage: {
    from(bucket) {
      return {
        async upload(filePath, file, options = {}) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('path', filePath);

          const headers = {};
          const sessionStr = localStorage.getItem('oa_session');
          if (sessionStr) {
            try {
              const parsed = JSON.parse(sessionStr);
              if (parsed && parsed.access_token) {
                headers['Authorization'] = `Bearer ${parsed.access_token}`;
              }
            } catch(e) {}
          }

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers,
            body: formData
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return { data: null, error: new Error(errData.message || 'Upload failed') };
          }

          const res = await response.json();
          return { data: res.data, error: null };
        },

        getPublicUrl(filePath) {
          return {
            data: {
              publicUrl: `/uploads/${filePath}`
            }
          };
        },

        async remove(paths) {
          const headers = { 'Content-Type': 'application/json' };
          const sessionStr = localStorage.getItem('oa_session');
          if (sessionStr) {
            try {
              const parsed = JSON.parse(sessionStr);
              if (parsed && parsed.access_token) {
                headers['Authorization'] = `Bearer ${parsed.access_token}`;
              }
            } catch(e) {}
          }

          const response = await fetch('/api/upload', {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ paths })
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return { data: null, error: new Error(errData.message || 'Delete failed') };
          }

          const res = await response.json();
          return { data: res.data, error: null };
        }
      };
    }
  },

  channel() {
    return {
      on() { return this; },
      subscribe() { return this; }
    };
  },

  removeChannel() {}
};
