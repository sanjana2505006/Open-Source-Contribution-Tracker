import { useEffect } from 'react';

type PageMeta = {
  title: string;
  description?: string;
  image?: string | null;
};

const DEFAULT_TITLE = 'OSCT — Open Source Contribution Tracker';
const DEFAULT_DESCRIPTION =
  'Track pull requests, issues, and open source contributions in one dashboard.';

function upsertMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertOg(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageMeta({ title, description, image }: PageMeta) {
  useEffect(() => {
    const fullTitle = title === DEFAULT_TITLE ? title : `${title} · OSCT`;
    document.title = fullTitle;

    const desc = description ?? DEFAULT_DESCRIPTION;
    upsertMeta('description', desc);
    upsertOg('og:title', fullTitle);
    upsertOg('og:description', desc);
    upsertOg('og:type', 'profile');

    if (image) {
      upsertOg('og:image', image);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      upsertMeta('description', DEFAULT_DESCRIPTION);
      upsertOg('og:title', DEFAULT_TITLE);
      upsertOg('og:description', DEFAULT_DESCRIPTION);
      upsertOg('og:type', 'website');
    };
  }, [title, description, image]);
}

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION };
