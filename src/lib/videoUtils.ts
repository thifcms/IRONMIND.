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
  let videoId = '';

  // Extract ID from different formats
  if (url.includes('youtube.com/watch?v=')) {
    const parts = url.split('v=');
    if (parts[1]) {
      videoId = parts[1].split('&')[0];
    }
  } else if (url.includes('youtube.com/shorts/')) {
    const parts = url.split('shorts/');
    if (parts[1]) {
      videoId = parts[1].split('?')[0];
    }
  } else if (url.includes('youtu.be/')) {
    const parts = url.split('youtu.be/');
    if (parts[1]) {
      videoId = parts[1].split('?')[0];
    }
  } else if (url.includes('youtube.com/embed/')) {
    const parts = url.split('embed/');
    if (parts[1]) {
      videoId = parts[1].split('?')[0];
    }
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`;
  }

  return url;
}

export function getYouTubeSearchUrl(name: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent('execução técnica ' + name)}`;
}
