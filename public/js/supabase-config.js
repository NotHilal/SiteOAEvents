/* =====================================================
   OA Événementiel — Mock Supabase Config for Next.js
   Redirects all Supabase queries to Next.js API endpoints.
   ===================================================== */

(function() {
  "use strict";

  function getAuthToken() {
    try {
      const session = JSON.parse(localStorage.getItem('oa_session') || 'null');
      return session ? session.access_token : '';
    } catch(e) {
      return '';
    }
  }

  async function handleApiResponse(res) {
    const data = await res.json();
    if (!res.ok) {
      return { data: null, error: { message: data.message || 'API Error' } };
    }
    return { data: data.data, error: null };
  }

  const mockSupabase = {
    auth: {
      _listeners: [],
      async signInWithPassword({ email, password }) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const result = await res.json();
        if (res.ok) {
          localStorage.setItem('oa_session', JSON.stringify(result.session));
          this._triggerStateChange('SIGNED_IN', result.session);
          return { data: result, error: null };
        }
        return { data: null, error: { message: result.message || 'Identifiants incorrects' } };
      },
      async signOut() {
        localStorage.removeItem('oa_session');
        this._triggerStateChange('SIGNED_OUT', null);
        return { error: null };
      },
      onAuthStateChange(callback) {
        this._listeners.push(callback);
        // Execute immediately with current state
        try {
          const session = JSON.parse(localStorage.getItem('oa_session') || 'null');
          callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        } catch(e) {
          callback('SIGNED_OUT', null);
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                this._listeners = this._listeners.filter(cb => cb !== callback);
              }
            }
          }
        };
      },
      _triggerStateChange(event, session) {
        this._listeners.forEach(cb => {
          try { cb(event, session); } catch(e) {}
        });
      }
    },
    from(table) {
      const queryObj = {
        _table: table,
        _select: '*',
        _filters: [],
        _order: null,
        _limit: null,
        _method: 'GET',
        _body: null,
        _single: false,

        select(fields) {
          this._select = fields || '*';
          return this;
        },
        eq(field, value) {
          this._filters.push({ type: 'eq', field, value });
          return this;
        },
        in(field, values) {
          this._filters.push({ type: 'in', field, values });
          return this;
        },
        lte(field, value) {
          this._filters.push({ type: 'lte', field, value });
          return this;
        },
        order(field, opts) {
          this._order = { field, ascending: opts ? opts.ascending : true };
          return this;
        },
        limit(val) {
          this._limit = val;
          return this;
        },
        single() {
          this._single = true;
          return this;
        },
        insert(payload) {
          this._method = 'POST';
          this._body = payload;
          return this;
        },
        update(payload) {
          this._method = 'PUT';
          this._body = payload;
          return this;
        },
        delete() {
          this._method = 'DELETE';
          return this;
        },

        // This makes the object Thenable, meaning 'await' resolves it automatically
        then(onfulfilled, onrejected) {
          return this._execute().then(onfulfilled, onrejected);
        },

        async _execute() {
          const params = new URLSearchParams({
            table: this._table,
            select: this._select,
            filters: JSON.stringify(this._filters)
          });
          if (this._order) params.append('order', JSON.stringify(this._order));
          if (this._limit) params.append('limit', this._limit);

          const url = `/api/db?${params.toString()}`;
          const options = {
            method: this._method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`
            }
          };
          if (this._body) {
            options.body = JSON.stringify(this._body);
          }

          try {
            const res = await fetch(url, options);
            const result = await handleApiResponse(res);
            if (this._single && result.data) {
              result.data = Array.isArray(result.data) ? result.data[0] : result.data;
            }
            return result;
          } catch(err) {
            return { data: null, error: err };
          }
        }
      };
      return queryObj;
    },

    storage: {
      from(bucket) {
        return {
          _bucket: bucket,
          async upload(path, file, options) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', path);
            formData.append('bucket', this._bucket);

            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${getAuthToken()}`
              },
              body: formData
            });
            const result = await res.json();
            if (!res.ok) {
              return { data: null, error: { message: result.message || 'Upload error' } };
            }
            return { data: result.data, error: null };
          },
          getPublicUrl(path) {
            // Direct path to uploads folder in public
            return {
              data: {
                publicUrl: `/uploads/${path}`
              }
            };
          },
          async remove(paths) {
            try {
              const res = await fetch('/api/upload', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ paths, bucket: this._bucket })
              });
              return handleApiResponse(res);
            } catch(e) {
              return { data: null, error: e };
            }
          }
        };
      }
    },

    // Realtime channel Mock
    channel(name) {
      return {
        on(event, filter, callback) {
          // Return chainable
          return this;
        },
        subscribe() {
          return this;
        }
      };
    }
  };

  window.supabase = {
    createClient: () => mockSupabase
  };

  const { createClient } = window.supabase;
  window.db = createClient();
})();
