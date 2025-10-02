import { useState, useEffect } from 'react';

/**
 * Hook para detectar media queries responsivas
 * @param {string} query - Media query CSS (ex: '(max-width: 768px)')
 * @returns {boolean} - true se a media query corresponde
 */
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener function
    const handler = (event) => setMatches(event.matches);

    // Add listener
    mediaQuery.addEventListener('change', handler);

    // Cleanup
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

export default useMediaQuery;
