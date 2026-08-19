import test from "node:test";
import assert from "node:assert/strict";

import {
  isAppleDevice,
  preferH264First,
  getAllSingleStreamSources,
  getSingleStreamSourcesList,
  getAllVideoSourcesForEntry,
  getVideoSourcesForEntryList,
  hasPlayableSource,
  selectBestPlayableQuality,
} from "../src/utils/streamType2Fallback.js";

test("isAppleDevice accurately detects Apple devices (Safari and Chrome on iOS and macOS)", () => {
  // iPhone Safari
  const iPhoneSafari = {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
  };
  assert.equal(isAppleDevice(iPhoneSafari), true);

  // iPhone Chrome (CriOS)
  const iPhoneChrome = {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
  };
  assert.equal(isAppleDevice(iPhoneChrome), true);

  // iPad Safari (Desktop UA with touch points)
  const iPadSafari = {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    platform: "MacIntel",
    maxTouchPoints: 5,
  };
  assert.equal(isAppleDevice(iPadSafari), true);

  // macOS Safari
  const macSafari = {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    platform: "MacIntel",
    maxTouchPoints: 0,
  };
  assert.equal(isAppleDevice(macSafari), true);

  // macOS Chrome
  const macChrome = {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "MacIntel",
    maxTouchPoints: 0,
  };
  assert.equal(isAppleDevice(macChrome), true);

  // Windows Chrome (Non-Apple)
  const windowsChrome = {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "Win32",
    maxTouchPoints: 0,
  };
  assert.equal(isAppleDevice(windowsChrome), false);

  // Android Chrome (Non-Apple)
  const androidChrome = {
    userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    maxTouchPoints: 5,
  };
  assert.equal(isAppleDevice(androidChrome), false);
});

test("preferH264First places mp4 and h264 before webm and other codecs", () => {
  const sources = [
    { url: "https://example.com/video.webm", mimeType: "video/webm; codecs=\"vp9\"" },
    { url: "https://example.com/video.mp4", mimeType: "video/mp4; codecs=\"avc1.640028\"" },
  ];
  const sorted = preferH264First(sources);
  assert.equal(sorted[0].url, "https://example.com/video.mp4");
  assert.equal(sorted[1].url, "https://example.com/video.webm");
});

test("getSingleStreamSourcesList returns all sources normally, but exactly one source when Apple fallback is active", () => {
  const entry = {
    sources: [
      { url: "https://example.com/hls.m3u8", mimeType: "application/x-mpegURL", isM3u8: true },
      { url: "https://example.com/stream1.mp4", mimeType: "video/mp4", isM3u8: false },
      { url: "https://example.com/stream2.webm", mimeType: "video/webm", isM3u8: false },
    ],
  };

  // Non-Apple: returns all
  const nonApple = getSingleStreamSourcesList(entry, { isApple: false, fallbackActive: false });
  assert.equal(nonApple.length, 3);

  // Apple normal: returns all
  const appleNormal = getSingleStreamSourcesList(entry, { isApple: true, fallbackActive: false });
  assert.equal(appleNormal.length, 3);

  // Apple fallback index 0: returns 1 source only (URL 0)
  const appleFb0 = getSingleStreamSourcesList(entry, { isApple: true, fallbackActive: true, sourceIndex: 0 });
  assert.equal(appleFb0.length, 1);
  assert.equal(appleFb0[0].url, "https://example.com/hls.m3u8");

  // Apple fallback index 1: returns 1 source only (URL 1)
  const appleFb1 = getSingleStreamSourcesList(entry, { isApple: true, fallbackActive: true, sourceIndex: 1 });
  assert.equal(appleFb1.length, 1);
  assert.equal(appleFb1[0].url, "https://example.com/stream1.mp4");

  // Apple fallback index 2: returns 1 source only (URL 2)
  const appleFb2 = getSingleStreamSourcesList(entry, { isApple: true, fallbackActive: true, sourceIndex: 2 });
  assert.equal(appleFb2.length, 1);
  assert.equal(appleFb2[0].url, "https://example.com/stream2.webm");
});

test("getVideoSourcesForEntryList returns all sources normally, but exactly one source when Apple fallback is active", () => {
  const entry = {
    video: {
      sources: [
        { url: "https://example.com/video1.mp4", mimeType: "video/mp4; codecs=\"avc1\"" },
        { url: "https://example.com/video2.webm", mimeType: "video/webm; codecs=\"vp9\"" },
      ],
    },
  };

  // Apple fallback index 0: 1 source only
  const appleFb0 = getVideoSourcesForEntryList(entry, { isApple: true, fallbackActive: true, sourceIndex: 0 });
  assert.equal(appleFb0.length, 1);
  assert.equal(appleFb0[0].url, "https://example.com/video1.mp4");

  // Apple fallback index 1: 1 source only
  const appleFb1 = getVideoSourcesForEntryList(entry, { isApple: true, fallbackActive: true, sourceIndex: 1 });
  assert.equal(appleFb1.length, 1);
  assert.equal(appleFb1[0].url, "https://example.com/video2.webm");
});

test("getAllSingleStreamSources with useM3u8=false excludes all m3u8 sources", () => {
  const entry = {
    sources: [
      { url: "https://example.com/hls.m3u8", mimeType: "application/x-mpegURL", isM3u8: true },
      { url: "https://example.com/stream1.webm", mimeType: "video/webm", isM3u8: false },
      { url: "https://example.com/stream2.mp4", mimeType: "video/mp4", isM3u8: false },
    ],
  };

  const withM3u8 = getAllSingleStreamSources(entry, { useM3u8: true });
  assert.equal(withM3u8.length, 3);
  assert.equal(withM3u8[0].isM3u8, true);

  const withoutM3u8 = getAllSingleStreamSources(entry, { useM3u8: false });
  assert.equal(withoutM3u8.length, 2);
  assert.equal(withoutM3u8.every((s) => !s.isM3u8), true);
  // preferH264First puts mp4 before webm
  assert.equal(withoutM3u8[0].url, "https://example.com/stream2.mp4");
  assert.equal(withoutM3u8[1].url, "https://example.com/stream1.webm");
});

test("selectBestPlayableQuality selects 360p and ignores 1080p/720p when 1080p/720p only have m3u8 and useM3u8=false", () => {
  const sources = {
    "1080p": {
      url: "https://example.com/1080p.m3u8",
      isM3u8: true,
      sources: [{ url: "https://example.com/1080p.m3u8", isM3u8: true }],
    },
    "720p": {
      url: "https://example.com/720p.m3u8",
      isM3u8: true,
      sources: [{ url: "https://example.com/720p.m3u8", isM3u8: true }],
    },
    "360p": {
      url: "https://example.com/360p.mp4",
      isM3u8: false,
      sources: [{ url: "https://example.com/360p.mp4", isM3u8: false }],
    },
  };
  const availableQualities = ["1080p", "720p", "360p"];

  // When useM3u8 is true, 1080p is preferred
  const withM3u8 = selectBestPlayableQuality(sources, availableQualities, "auto", { useM3u8: true });
  assert.equal(withM3u8, "1080p");

  // When useM3u8 is false (e.g. m3u8 timed out or failed), 1080p and 720p have empty/no non-m3u8 URLs, so 360p is chosen!
  const withoutM3u8 = selectBestPlayableQuality(sources, availableQualities, "1080p", { useM3u8: false });
  assert.equal(withoutM3u8, "360p");

  assert.equal(hasPlayableSource(sources["1080p"], { useM3u8: false }), false);
  assert.equal(hasPlayableSource(sources["720p"], { useM3u8: false }), false);
  assert.equal(hasPlayableSource(sources["360p"], { useM3u8: false }), true);
});


