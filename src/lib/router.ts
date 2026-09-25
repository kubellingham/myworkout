import { useEffect, useState } from 'react';

function current(): string[] {
  const h = window.location.hash.replace(/^#\/?/, '');
  return h ? h.split('/') : ['spin'];
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const on = () => {
      setRoute(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(path: string): void {
  window.location.hash = `/${path}`;
}
