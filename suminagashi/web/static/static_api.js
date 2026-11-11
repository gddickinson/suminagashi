// Static-site data layer: answers api('/...') from the JSON files exported by scripts/build_static.py
// (every GET in STATIC_ENDPOINTS of suminagashi/web/app.py). The simulator itself runs in JS; only POST /render
// (the numpy engine) needs the local Python server, and its button is not shown on the static site.
const files = new Map();

export async function staticApi(path, body) {
  if (body) throw new Error('This feature needs the full app running locally (Python server)');
  const rel = path.split('?')[0].replace(/^\/+/, '');
  if (!files.has(rel)) {
    files.set(rel, fetch('api/' + rel + '.json').then(r => {
      if (!r.ok) throw new Error(`${r.status} ${rel}`);
      return r.json();
    }));
  }
  return files.get(rel);
}
