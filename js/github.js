/* Hilos de Coral · conexión con GitHub para el panel admin.
   Lee los datos directamente del repositorio y publica todos los cambios en un único commit. */
(function (global) {
  'use strict';
  const API = 'https://api.github.com';

  class GitHub {
    constructor(cfg) {
      this.owner = (cfg.owner || '').trim();
      this.repo = (cfg.repo || '').trim();
      this.branch = (cfg.branch || 'main').trim();
      this.token = (cfg.token || '').trim();
    }

    get listo() { return !!(this.owner && this.repo && this.token); }

    async pedir(ruta, opciones) {
      const o = opciones || {};
      const r = await fetch(API + ruta, {
        method: o.method || 'GET',
        headers: Object.assign({
          'Accept': 'application/vnd.github+json',
          'Authorization': 'Bearer ' + this.token,
          'X-GitHub-Api-Version': '2022-11-28'
        }, o.body ? { 'Content-Type': 'application/json' } : {}, o.headers || {}),
        body: o.body ? JSON.stringify(o.body) : undefined,
        cache: 'no-store'
      });
      if (!r.ok) {
        let msg = '';
        try { msg = (await r.json()).message || ''; } catch (e) { /* sin cuerpo */ }
        const err = new Error(GitHub.explicar(r.status, msg));
        err.status = r.status;
        throw err;
      }
      if (o.raw) return r.text();
      return r.status === 204 ? null : r.json();
    }

    static explicar(status, msg) {
      if (status === 401) return 'El token no es válido o ha caducado.';
      if (status === 403) return 'El token no tiene permiso para esta acción (' + msg + ').';
      if (status === 404) return 'No se encuentra el repositorio o el archivo. Revisa usuario, repositorio y rama.';
      if (status === 409) return 'El repositorio está vacío o en conflicto. Sube primero los archivos de la tienda.';
      if (status === 422) return 'GitHub ha rechazado los cambios: ' + msg;
      return 'Error de GitHub (' + status + ')' + (msg ? ': ' + msg : '');
    }

    rutaRepo() { return '/repos/' + encodeURIComponent(this.owner) + '/' + encodeURIComponent(this.repo); }

    /* Comprueba que el token puede escribir en el repositorio */
    async probar() {
      const info = await this.pedir(this.rutaRepo());
      if (!info.permissions || !info.permissions.push) throw new Error('El token puede leer el repositorio, pero no tiene permiso de escritura (Contents: Read and write).');
      await this.pedir(this.rutaRepo() + '/branches/' + encodeURIComponent(this.branch));
      return info;
    }

    /* Lee un archivo de texto de la rama (siempre la versión más reciente) */
    async leerTexto(ruta) {
      return this.pedir(this.rutaRepo() + '/contents/' + ruta.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(this.branch), {
        raw: true, headers: { 'Accept': 'application/vnd.github.raw+json' }
      });
    }

    async leerJSON(ruta) { return JSON.parse(await this.leerTexto(ruta)); }

    /* Publica varios archivos (y borra otros) en un solo commit.
       archivos: [{ ruta, texto }] o [{ ruta, base64 }] · borrar: ['ruta', ...] */
    async publicar(archivos, borrar, mensaje, progreso) {
      const avisa = progreso || function () {};
      const rr = this.rutaRepo();
      avisa('Leyendo la última versión…');
      const ref = await this.pedir(rr + '/git/ref/heads/' + encodeURIComponent(this.branch));
      const padre = ref.object.sha;
      const commitPadre = await this.pedir(rr + '/git/commits/' + padre);

      const arbol = [];
      for (let i = 0; i < archivos.length; i++) {
        const a = archivos[i];
        avisa('Subiendo ' + (i + 1) + ' de ' + archivos.length + '…');
        const blob = await this.pedir(rr + '/git/blobs', {
          method: 'POST',
          body: a.base64 != null ? { content: a.base64, encoding: 'base64' } : { content: a.texto, encoding: 'utf-8' }
        });
        arbol.push({ path: a.ruta, mode: '100644', type: 'blob', sha: blob.sha });
      }

      avisa('Preparando el commit…');
      const crearArbol = (conBorrados) => this.pedir(rr + '/git/trees', {
        method: 'POST',
        body: { base_tree: commitPadre.tree.sha, tree: arbol.concat(conBorrados ? (borrar || []).map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null })) : []) }
      });
      let nuevoArbol;
      try { nuevoArbol = await crearArbol(true); }
      catch (e) { if ((borrar || []).length) nuevoArbol = await crearArbol(false); else throw e; }

      const commit = await this.pedir(rr + '/git/commits', {
        method: 'POST',
        body: { message: mensaje || 'Actualizar tienda desde el panel', tree: nuevoArbol.sha, parents: [padre] }
      });
      avisa('Publicando…');
      await this.pedir(rr + '/git/refs/heads/' + encodeURIComponent(this.branch), { method: 'PATCH', body: { sha: commit.sha, force: false } });
      return commit;
    }

    urlWeb() { return 'https://' + this.owner.toLowerCase() + '.github.io/' + this.repo + '/'; }
  }

  /* Detecta usuario y repositorio cuando el panel está publicado en GitHub Pages */
  GitHub.detectar = function () {
    const h = location.hostname.match(/^([^.]+)\.github\.io$/i);
    if (!h) return {};
    const seg = location.pathname.split('/').filter(Boolean);
    return { owner: h[1], repo: seg[0] && seg[0] !== 'admin' ? seg[0] : h[1] + '.github.io' };
  };

  global.GitHub = GitHub;
})(window);
