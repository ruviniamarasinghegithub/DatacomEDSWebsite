import { getMetadata } from './aem.js';

export function getSiteRegion(authoredRegion = '') {
  const candidates = [authoredRegion, getMetadata('region'), getMetadata('search-region')];
  const region = candidates.map((value) => (value || '').trim().toLowerCase())
    .find((value) => ['nz', 'au'].includes(value));
  if (region) return region;

  const path = window.location.pathname.replace(/^\/content\/datacom(?=\/|$)/, '');
  const match = path.match(/^\/(nz|au)(?:\/|$)/i);
  return match ? match[1].toLowerCase() : '';
}

export function getRegionalDocumentPath(name) {
  const explicitPath = (getMetadata(name) || '').trim();
  if (explicitPath) return explicitPath;

  const region = getSiteRegion();
  const isLanguageMaster = /^\/language-masters\/en(?:\/|$)/i.test(window.location.pathname);
  return region || isLanguageMaster ? `/language-masters/en/${name}` : `/${name}`;
}
