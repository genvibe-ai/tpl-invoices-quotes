import { useEffect, useState } from 'react';

function read() {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

export function useHashRoute() {
  const [hash, setHash] = useState(read);
  useEffect(() => {
    const on = () => setHash(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [path, qs = ''] = hash.split('?');
  return { path, segments: path.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) {
    window.history.replaceState(null, '', '#' + to);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = to;
  }
}
