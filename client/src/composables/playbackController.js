const AUTOPLAY_DELAY_MS = 3000;
const BUFFER_RESUME_SECONDS = 4;
const LOOP_BUFFER_SECONDS = 5;
const USER_GESTURE_KEY = "yt_user_gesture_v1";

function getBufferedAhead(element) {
  try {
    if (!element?.buffered) return 0;
    const currentTime = element.currentTime || 0;
    const buffered = element.buffered;
    for (let index = buffered.length - 1; index >= 0; index -= 1) {
      const start = buffered.start(index);
      const end = buffered.end(index);
      if (end > currentTime) {
        if (start <= currentTime) return end - currentTime;
        return end - currentTime;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

export function createPlaybackController({
  videoRef,
  audioRef,
  settingsVisible,
  showUnmutePrompt,
  autoplayEnabled,
  repeatEnabled,
  isCurrentlyUsingM3u8,
  startM3u8LoadTimeout,
  clearM3u8LoadTimeout,
}) {
  let autoplayTimer = null;
  let buffering = false;
  let bufferListenersAttached = false;
  let loopResumeTimer = null;
  let loopBufferListenersAttached = false;
  let settingsHideTimer = null;

  function playMedia() {
    try { if (videoRef.value) videoRef.value.play(); } catch {}
    try { if (audioRef.value) audioRef.value.play(); } catch {}
  }

  function showSettingsBox() {
    try {
      settingsVisible.value = true;
      clearTimeout(settingsHideTimer);
      settingsHideTimer = setTimeout(() => {
        settingsVisible.value = false;
      }, 3000);
    } catch {}
  }

  function checkAndResumeIfBuffered() {
    const videoAhead = getBufferedAhead(videoRef.value);
    const audioAhead = audioRef.value
      ? getBufferedAhead(audioRef.value)
      : videoAhead;
    if (
      buffering &&
      videoAhead >= BUFFER_RESUME_SECONDS &&
      audioAhead >= BUFFER_RESUME_SECONDS
    ) {
      buffering = false;
      playMedia();
      detachBufferListeners();
    }
  }

  function attachBufferListeners() {
    if (bufferListenersAttached) return;
    try {
      if (videoRef.value) {
        videoRef.value.addEventListener("waiting", onWaiting);
        videoRef.value.addEventListener("progress", onProgress);
        videoRef.value.addEventListener("playing", onPlaying);
      }
      if (audioRef.value) {
        audioRef.value.addEventListener("waiting", onWaiting);
        audioRef.value.addEventListener("progress", onProgress);
        audioRef.value.addEventListener("playing", onPlaying);
      }
      bufferListenersAttached = true;
    } catch {}
  }

  function detachBufferListeners() {
    if (!bufferListenersAttached) return;
    try {
      if (videoRef.value) {
        videoRef.value.removeEventListener("waiting", onWaiting);
        videoRef.value.removeEventListener("progress", onProgress);
        videoRef.value.removeEventListener("playing", onPlaying);
      }
      if (audioRef.value) {
        audioRef.value.removeEventListener("waiting", onWaiting);
        audioRef.value.removeEventListener("progress", onProgress);
        audioRef.value.removeEventListener("playing", onPlaying);
      }
    } catch {}
    bufferListenersAttached = false;
  }

  function onWaiting() {
    buffering = true;
    attachBufferListeners();
    if (isCurrentlyUsingM3u8()) startM3u8LoadTimeout();
  }

  function onProgress() {
    if (buffering) checkAndResumeIfBuffered();
  }

  function onPlaying() {
    buffering = false;
    clearM3u8LoadTimeout();
    detachBufferListeners();
  }

  function grantPlayback() {
    try { localStorage.setItem(USER_GESTURE_KEY, "1"); } catch {}
    showUnmutePrompt.value = false;
    try {
      if (videoRef.value) {
        videoRef.value.muted = false;
        videoRef.value.play();
      }
      if (audioRef.value) {
        audioRef.value.muted = false;
        audioRef.value.play();
      }
    } catch {}
  }

  function scheduleAutoplay() {
    try {
      if (autoplayTimer) {
        clearTimeout(autoplayTimer);
        autoplayTimer = null;
      }
    } catch {}
    if (!autoplayEnabled.value) return;
    autoplayTimer = setTimeout(() => {
      try {
        if (videoRef.value) videoRef.value.play();
        if (audioRef.value) audioRef.value.play();
      } catch {}
      autoplayTimer = null;
    }, AUTOPLAY_DELAY_MS);
  }

  function cancelAutoplay() {
    try {
      if (autoplayTimer) {
        clearTimeout(autoplayTimer);
        autoplayTimer = null;
      }
    } catch {}
  }

  function onTimeUpdateLoopHandler() {
    try {
      if (!videoRef.value || !repeatEnabled.value) return;
      const currentTime = videoRef.value.currentTime || 0;
      if (currentTime <= 0.12 && videoRef.value.paused) startLoopResume();
    } catch {}
  }

  function startLoopResume() {
    try { cancelLoopResume(); } catch {}
    loopResumeTimer = setTimeout(() => {
      try { attemptResumeLoop(); } catch {}
    }, LOOP_BUFFER_SECONDS * 1000);
  }

  function cancelLoopResume() {
    try {
      if (loopResumeTimer) {
        clearTimeout(loopResumeTimer);
        loopResumeTimer = null;
      }
    } catch {}
    detachLoopBufferListeners();
  }

  function attemptResumeLoop() {
    const videoAhead = getBufferedAhead(videoRef.value);
    const audioAhead = audioRef.value
      ? getBufferedAhead(audioRef.value)
      : videoAhead;
    if (
      videoAhead >= LOOP_BUFFER_SECONDS &&
      audioAhead >= LOOP_BUFFER_SECONDS
    ) {
      playMedia();
      cancelLoopResume();
    } else {
      attachLoopBufferListeners();
    }
  }

  function attachLoopBufferListeners() {
    if (loopBufferListenersAttached) return;
    try {
      if (videoRef.value) {
        videoRef.value.addEventListener("progress", onLoopBufferProgress);
        videoRef.value.addEventListener("playing", onLoopBufferProgress);
      }
      if (audioRef.value) {
        audioRef.value.addEventListener("progress", onLoopBufferProgress);
        audioRef.value.addEventListener("playing", onLoopBufferProgress);
      }
      loopBufferListenersAttached = true;
    } catch {}
  }

  function detachLoopBufferListeners() {
    if (!loopBufferListenersAttached) return;
    try {
      if (videoRef.value) {
        videoRef.value.removeEventListener("progress", onLoopBufferProgress);
        videoRef.value.removeEventListener("playing", onLoopBufferProgress);
      }
      if (audioRef.value) {
        audioRef.value.removeEventListener("progress", onLoopBufferProgress);
        audioRef.value.removeEventListener("playing", onLoopBufferProgress);
      }
    } catch {}
    loopBufferListenersAttached = false;
  }

  function onLoopBufferProgress() {
    try {
      const videoAhead = getBufferedAhead(videoRef.value);
      const audioAhead = audioRef.value
        ? getBufferedAhead(audioRef.value)
        : videoAhead;
      if (
        videoAhead >= LOOP_BUFFER_SECONDS &&
        audioAhead >= LOOP_BUFFER_SECONDS
      ) {
        playMedia();
        cancelLoopResume();
      }
    } catch {}
  }

  return {
    attachBufferListeners,
    cancelAutoplay,
    detachBufferListeners,
    detachLoopBufferListeners,
    handleUnmuteClick: grantPlayback,
    onFirstUserGesture: grantPlayback,
    onTimeUpdateLoopHandler,
    scheduleAutoplay,
    showSettingsBox,
  };
}
