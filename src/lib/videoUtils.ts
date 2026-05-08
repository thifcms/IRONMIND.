import { Exercise } from '../types';
import { EXERCISE_LIBRARY } from '../constants/exercises';

export function resolveVideoUrl(ex: Exercise | { name: string; videoUrl?: string }) {
  // 1. Priority: Video already in the object
  if (ex.videoUrl) return ex.videoUrl;

  // 2. Second option: Search static library with normalization
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const searchName = normalize(ex.name);

  const libraryMatch = EXERCISE_LIBRARY.find(libEx => {
    const libName = normalize(libEx.name);
    return libName === searchName || libName.includes(searchName) || searchName.includes(libName);
  });

  if (libraryMatch?.videoUrl) return libraryMatch.videoUrl;

  return null;
}

export function formatVideoUrl(rawUrl: string | null) {
  if (!rawUrl) return null;
  
  let url = rawUrl;
  // Handle YouTube Watch URLs
  if (url.includes('youtube.com/watch?v=')) {
    url = url.replace('watch?v=', 'embed/');
  } 
  // Handle YouTube Shorts
  else if (url.includes('youtube.com/shorts/')) {
    url = url.replace('shorts/', 'embed/');
  }
  // Handle youtu.be short URLs
  else if (url.includes('youtu.be/')) {
    const id = url.split('/').pop()?.split('?')[0];
    url = `https://www.youtube.com/embed/${id}`;
  }

  // Clean up parameters
  if (url.includes('&t=')) {
    url = url.split('&t=')[0];
  }

  const connector = url.includes('?') ? '&' : '?';
  return `${url}${connector}autoplay=1&mute=1&rel=0`;
}

export function getYouTubeSearchUrl(name: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent('execução técnica ' + name)}`;
}
