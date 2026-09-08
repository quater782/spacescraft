(() => {
  "use strict";

  const STREAM_SALTS = Object.freeze({
    combat: 0x243f6a88,
    draft: 0x85a308d3,
    loot: 0x13198a2e,
    route: 0x03707344,
    cosmetic: 0xa4093822,
  });

  function normalizeSeed(seed) {
    return (Number(seed) >>> 0) || 0x6d2b79f5;
  }

  function deriveSeed(seed, salt) {
    let value = (normalizeSeed(seed) ^ (Number(salt) >>> 0)) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
    value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
    value = (value ^ (value >>> 16)) >>> 0;
    return value || 0x6d2b79f5;
  }

  function createRng(seed) {
    let state = normalizeSeed(seed);
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function createStreams(runSeed) {
    const streams = {};
    for (const [name, salt] of Object.entries(STREAM_SALTS)) streams[name] = createRng(deriveSeed(runSeed, salt));
    return Object.freeze(streams);
  }

  window.SpaceRng = Object.freeze({ STREAM_SALTS, normalizeSeed, deriveSeed, createRng, createStreams });
})();
