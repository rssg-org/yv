<template>
  <div
    v-if="error"
    class="error-box"
    :class="{ 'premiere-scheduled': isPremiereScheduled }"
    role="alert"
    aria-live="polite"
  >
    <div class="error-title">
      {{ isPremiereScheduled ? "プレミア公開を待っています" : "⚠️ エラー" }}
    </div>
    <div class="error-message">{{ error }}</div>
    <div v-if="isPremiereScheduled && premiereScheduledText" class="premiere-scheduled-at">
      公開予定: {{ premiereScheduledText }}
    </div>
    <button
      v-if="!hideErrorReloadButton"
      @click="reloadStream"
      class="reload-button"
    >
      再取得
    </button>
  </div>
  <div v-else-if="selectedQuality && availableQualities.length > 0" class="video-container">
    <!-- single-stream (audio+video) が使える場合 -->
    <template v-if="isSingleStreamEntry(sources[selectedQuality])">
      <video
        ref="videoRef"
        controls
        preload="metadata"
        :autoplay="autoplayEnabled"
        :loop="repeatEnabled"
        :key="`${playerRenderKey}:${selectedQuality}:${appleSourceIndex}:${sources[selectedQuality]?.url || ''}`"
        @canplay="markPlayerReady"
        @loadedmetadata="markPlayerReady"
        @loadeddata="markPlayerReady"
        @playing="markPlayerPlaying"
        @waiting="markPlayerBuffering"
        @error="handleVideoError"
      >
        <source
          v-for="s in getSingleStreamSources(sources[selectedQuality])"
          :key="s.url"
          :src="s.url"
          :type="s.mimeType || (s.isM3u8 ? 'application/x-mpegURL' : undefined)"
          @error="handleSourceError"
        />
      </video>

      <div v-if="showUnmutePrompt" class="unmute-prompt" @click.stop="handleUnmuteClick">
        ミュートを解除する
      </div>

      <div class="settings-box" v-show="settingsVisible">
        <label>
          繰り返し:
          <input type="checkbox" v-model="repeatEnabled" />
        </label>
        <label :class="{ 'autoplay-disabled': repeatEnabled }">
          自動再生:
          <input type="checkbox" v-model="autoplayEnabled" :disabled="repeatEnabled" />
        </label>

        <button
          type="button"
          class="pip-button"
          :disabled="!pictureInPictureSupported"
          :title="pictureInPictureSupported
            ? 'ピクチャインピクチャを切り替える'
            : 'この動画またはブラウザはピクチャインピクチャに対応していません'"
          @click="togglePictureInPicture"
        >
          {{ pictureInPictureActive ? "PiPを終了" : "ピクチャインピクチャ" }}
        </button>

        <label>
          画質:
          <select v-model="selectedQuality" class="selector">
            <option v-for="q in availableQualities" :key="q" :value="q">
              {{ qualityLabels[q] || q }}
            </option>
          </select>
        </label>

        <!-- 非 Apple デバイスでは再生速度選択を常に表示 -->
        <label v-if="!isAppleDevice()">
          再生速度:
          <select v-model.number="selectedPlaybackRate" class="selector">
            <option v-for="rate in playbackRates" :key="rate" :value="rate">
              {{ rate }}x
            </option>
          </select>
        </label>

        <button @click="reloadStream" class="reload-button">再読込み</button>
      </div>
      <div v-if="isQualitySwitching" class="block-overlay" aria-hidden="true"></div>
    </template>

    <!-- その他: videourl (video+audio) の再生 / audio-only -->
    <template v-else>
      <template v-if="isAudioOnlyEntry(sources[selectedQuality])">
        <div class="audio-only">
          <audio
            ref="audioRef"
            preload="auto"
            :autoplay="autoplayEnabled"
            controls
            :key="`${playerRenderKey}:audio:${selectedQuality}`"
            @canplay="markPlayerReady"
            @loadedmetadata="markPlayerReady"
            @loadeddata="markPlayerReady"
            @playing="markPlayerPlaying"
            @waiting="markPlayerBuffering"
          >
            <source
              :src="sources[selectedQuality]?.audio?.url"
              :type="sources[selectedQuality]?.audio?.mimeType"
            />
          </audio>
        </div>
      </template>
      <template v-else>
        <video
          ref="videoRef"
          preload="auto"
          :autoplay="autoplayEnabled"
          controls
          :key="`${playerRenderKey}:${separateAvKey}:${selectedQuality}:${appleSourceIndex}:video`"
          @canplay="markPlayerReady"
          @loadedmetadata="markPlayerReady"
          @loadeddata="markPlayerReady"
          @playing="markPlayerPlaying"
          @waiting="markPlayerBuffering"
          @error="handleVideoError"
        >
          <source
            v-for="s in getVideoSourcesForEntry(sources[selectedQuality])"
            :key="s.url"
            :src="s.url"
            :type="s.mimeType"
            @error="handleSourceError"
          />
        </video>
        <div v-if="showUnmutePrompt" class="unmute-prompt" @click.stop="handleUnmuteClick">
          ミュートを解除する
        </div>
        <audio
          ref="audioRef"
          preload="auto"
          style="display:none;"
          autoplay
          :key="`${playerRenderKey}:${separateAvKey}:audio`"
          @canplay="markPlayerReady"
          @loadedmetadata="markPlayerReady"
          @loadeddata="markPlayerReady"
          @playing="markPlayerPlaying"
          @waiting="markPlayerBuffering"
        >
          <source
            :src="sources[selectedQuality]?.audio?.url"
            :type="sources[selectedQuality]?.audio?.mimeType"
          />
        </audio>
      </template>

      <div class="settings-box" v-show="settingsVisible">
        <label>
          繰り返し:
          <input type="checkbox" v-model="repeatEnabled" />
        </label>
        <label :class="{ 'autoplay-disabled': repeatEnabled }">
          自動再生:
            <input type="checkbox" v-model="autoplayEnabled" :disabled="repeatEnabled" />
        </label>

        <button
          type="button"
          class="pip-button"
          :disabled="!pictureInPictureSupported"
          :title="pictureInPictureSupported
            ? 'ピクチャインピクチャを切り替える'
            : 'この動画またはブラウザはピクチャインピクチャに対応していません'"
          @click="togglePictureInPicture"
        >
          {{ pictureInPictureActive ? "PiPを終了" : "ピクチャインピクチャ" }}
        </button>

        <label>
          画質:
          <select v-model="selectedQuality" class="selector">
            <option v-for="q in availableQualities" :key="q" :value="q">
              {{ qualityLabels[q] || q }}
            </option>
          </select>
        </label>

        <!-- 非 Apple デバイスでは再生速度選択を常に表示 -->
        <label v-if="!isAppleDevice()">
          再生速度:
          <select v-model.number="selectedPlaybackRate" class="selector">
            <option v-for="rate in playbackRates" :key="rate" :value="rate">
              {{ rate }}x
            </option>
          </select>
        </label>

        <button @click="reloadStream" class="reload-button">再読込み</button>
      </div>
      <div v-if="isQualitySwitching" class="block-overlay" aria-hidden="true"></div>
    </template>
    <PlayerLoading
      v-if="!playerReady || playerBuffering"
      overlay
    />
  </div>
  <PlayerLoading v-else-if="loading">
    <div class="stream-status-panel">
      <div class="stream-status-title">{{ streamStatusTitle }}</div>
      <div v-if="streamStatusDetail" class="stream-status-detail">
        {{ streamStatusDetail }}
      </div>
      <div v-if="estimatedWaitText" class="stream-status-wait">
        おおよその待ち時間: {{ estimatedWaitText }}
      </div>
    </div>
  </PlayerLoading>
</template>

<script setup>
import { computed, ref, watch, onMounted, nextTick, onBeforeUnmount } from "vue";
import PlayerLoading from "@/components/PlayerLoading.vue";
import {
  isVideoStreamError,
  stream as fetchStream,
  streamStatus as fetchStreamStatus,
} from "@/services/siatubeApi";
import { setupSyncPlayback } from "@/components/syncPlayback";
import { parseStream2Response } from "@/utils/type2StreamParser";
import {
  estimateStreamWaitMs,
  normalizeStreamStatus,
} from "@/utils/streamStatus";
import {
  extractSubtitleTracks,
  normalizeStreamFormats,
} from "@/utils/siatubeAdapters";
import {
  AUTOPLAY_SETTING_EVENT,
  loadAutoplay,
  loadPreferredQuality,
  saveAutoplay,
} from "@/utils/settingsManager";
import {
  getAutoplayCandidateId as selectAutoplayCandidateId,
  pushToAutoplayHistory,
} from "@/utils/autoplayManager";
import { loadHlsConstructor } from "@/utils/hlsLoader";
import {
  localizeSubtitleTracks,
  revokeSubtitleTracks,
  selectPlaybackSubtitleTracks,
} from "@/utils/subtitleTracks";
import { claimType2StreamRequestSlot } from "@/utils/type2StreamRequestCooldown";
import {
  isAppleDevice as isAppleDeviceCheck,
  isM3u8Source,
  getAllSingleStreamSources,
  getSingleStreamSourcesList,
  getVideoSourcesForEntryList,
  hasPlayableSource,
  selectBestPlayableQuality,
} from "@/utils/streamType2Fallback";

const props = defineProps({
  videoId: { type: String, required: true }
});
const emit = defineEmits([
  "ended",
  "play-autoplay-candidate",
  "autoplay-no-suitable-video",
]);
function reloadStream() {
  fetchStreamUrl(props.videoId, true);
}

const error = ref("");
const errorCode = ref("");
const errorExpiresAt = ref(0);
const isPremiereScheduled = computed(
  () => errorCode.value === "premiere_scheduled"
);
const hideErrorReloadButton = computed(
  () => isPremiereScheduled.value &&
    errorExpiresAt.value > 0 &&
    statusClock.value < errorExpiresAt.value
);
const premiereScheduledText = computed(() => {
  if (!isPremiereScheduled.value || errorExpiresAt.value <= 0) return "";
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(errorExpiresAt.value));
  } catch {
    return "";
  }
});
const sources = ref({});
const selectedQuality = ref("");
const availableQualities = ref([]);
const qualityLabels = ref({}); // Map from internal key to display label
const subtitleTracks = ref([]);
const selectedPlaybackRate = ref(1.0);
const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4];
const diffText = ref("0");
const videoRef = ref(null);
const audioRef = ref(null);
const pictureInPictureActive = ref(false);
const pictureInPictureSupported = computed(() => {
  const video = videoRef.value;
  if (!video) return false;
  return Boolean(
    (document.pictureInPictureEnabled &&
      typeof video.requestPictureInPicture === 'function') ||
    typeof video.webkitSetPresentationMode === 'function'
  );
});
const separateAvKey = ref(0);
// サーバー応答後に media 要素を確実に作り直すためのキー。
// 待機画面から復帰するときに古い video/audio の内部状態を持ち越さない。
const playerRenderKey = ref(0);
const appleFallbackActive = ref(false);
const appleSourceIndex = ref(0);
let lastAppleFallbackAttemptTime = 0;
const m3u8PlaybackDisabled = ref(false);
const M3U8_LOAD_TIMEOUT_MS = 10_000;
let m3u8LoadTimer = null;
const INITIAL_PLAYBACK_RECOVERY_DELAY_MS = 1500;
let initialPlaybackRecoveryTimer = null;
let initialPlaybackRecovery = null;
let initialPlaybackRecoveryRunning = false;
const repeatEnabled = ref(false);
const autoplayEnabled = ref(loadAutoplay());
const loading = ref(false);
const streamServerStatus = ref(null);
const streamStatusError = ref(false);
const streamStatusFetchedAt = ref(0);
const statusClock = ref(Date.now());
const STREAM_STATUS_INTERVAL_MS = 60_000;
let streamStatusTimer = null;
let statusClockTimer = null;

const streamStatusTitle = computed(() => {
  if (!streamServerStatus.value && !streamStatusError.value) {
    return "サーバー状況を確認しています…";
  }
  if (streamStatusError.value && !streamServerStatus.value) {
    return "サーバー状況を取得できませんでした";
  }
  const count = streamServerStatus.value?.processing?.count || 0;
  return count === 0
    ? "サーバーは空いています"
    : `サーバーで${count}件を処理中です`;
});

const streamStatusDetail = computed(() => {
  const ids = streamServerStatus.value?.processing?.ids || [];
  const ownIndex = ids.indexOf(props.videoId);
  if (ownIndex < 0) return "";
  return `この動画を処理中です（${ownIndex + 1}番目）`;
});

const estimatedWaitText = computed(() => {
  if (!streamServerStatus.value) return "";
  const elapsed = Math.max(0, statusClock.value - streamStatusFetchedAt.value);
  const waitMs = estimateStreamWaitMs(
    streamServerStatus.value,
    props.videoId,
    elapsed,
  );
  if (waitMs <= 0) return "まもなく完了予定";
  return `約${Math.max(1, Math.ceil(waitMs / 1000))}秒`;
});

async function updateStreamServerStatus() {
  try {
    const data = await fetchStreamStatus({ retries: 0, timeout: 10_000 });
    streamServerStatus.value = normalizeStreamStatus(data);
    streamStatusFetchedAt.value = Date.now();
    statusClock.value = streamStatusFetchedAt.value;
    streamStatusError.value = false;
  } catch {
    streamStatusError.value = true;
  }
}
const playerReady = ref(false);
const playerBuffering = ref(false);
const isQualitySwitching = ref(false);
const showUnmutePrompt = ref(false);
const settingsVisible = ref(true);
const USER_GESTURE_KEY = 'yt_user_gesture_v1';
const AUTOPLAY_DELAY_MS = 3000;
const LOOP_BUFFER_SECONDS = 5; // バッファの為の待ち時間
let _autoplayTimer = null;
let _buffering = false;
let _loopResumeTimer = null;
let _loopBufferListenersAttached = false;
const BUFFER_RESUME_SECONDS = 4;
let _onEndedAttached = false;
let streamRequestSequence = 0;
let hlsInstance = null;
let HlsConstructor = null;

function destroyHls() {
  if (!hlsInstance) return;
  try { hlsInstance.destroy(); } catch (e) {}
  hlsInstance = null;
}

function clearInitialPlaybackRecovery() {
  if (initialPlaybackRecoveryTimer !== null) {
    window.clearTimeout(initialPlaybackRecoveryTimer);
    initialPlaybackRecoveryTimer = null;
  }
  initialPlaybackRecovery = null;
  initialPlaybackRecoveryRunning = false;
}

function hasPlayableDuration(mediaEl = videoRef.value || audioRef.value) {
  if (!mediaEl) return false;
  const duration = mediaEl.duration;
  return duration === Infinity ||
    (Number.isFinite(duration) && duration > 0);
}

function isPrimaryMediaElement(mediaEl) {
  return mediaEl === videoRef.value ||
    (!videoRef.value && mediaEl === audioRef.value);
}

function qualityHeight(quality) {
  const match = String(quality || "").match(/^(\d+)p/);
  return match ? Number(match[1]) : 0;
}

function scheduleInitialPlaybackRecovery() {
  if (!initialPlaybackRecovery) return;
  if (initialPlaybackRecoveryTimer !== null) {
    window.clearTimeout(initialPlaybackRecoveryTimer);
  }
  initialPlaybackRecoveryTimer = window.setTimeout(
    recoverInitialPlayback,
    INITIAL_PLAYBACK_RECOVERY_DELAY_MS
  );
}

function beginInitialPlaybackRecovery(sequence, id, quality) {
  clearInitialPlaybackRecovery();
  if (!quality) return;
  initialPlaybackRecovery = { sequence, id, quality };
  scheduleInitialPlaybackRecovery();
}

async function recoverInitialPlayback() {
  initialPlaybackRecoveryTimer = null;
  const context = initialPlaybackRecovery;
  if (!context || hasPlayableDuration()) {
    clearInitialPlaybackRecovery();
    return;
  }
  if (
    context.sequence !== streamRequestSequence ||
    context.id !== props.videoId ||
    selectedQuality.value !== context.quality
  ) {
    clearInitialPlaybackRecovery();
    return;
  }

  // Apple端末の場合、まず現在の画質内の残りの単一URLを順々に試す
  if (isAppleDevice()) {
    const triedNext = tryNextAppleSource();
    if (triedNext) {
      return;
    }
  }

  // m3u8を使用中で再生できない場合は非m3u8へフォールバック
  if (isCurrentlyUsingM3u8()) {
    handleM3u8LoadTimeout();
    return;
  }

  // 再生可能な画質を検索（空URLの画質は除外される）
  const fallbackQuality = selectBestPlayableQuality(
    sources.value,
    availableQualities.value.filter((q) => q !== context.quality),
    "",
    { useM3u8: useM3u8Playback() }
  );

  if (!fallbackQuality) {
    clearInitialPlaybackRecovery();
    return;
  }
  initialPlaybackRecoveryRunning = true;
  selectedQuality.value = "";
  await nextTick();
  if (
    context.sequence !== streamRequestSequence ||
    context.id !== props.videoId
  ) {
    clearInitialPlaybackRecovery();
    return;
  }
  appleFallbackActive.value = false;
  appleSourceIndex.value = 0;
  playerRenderKey.value += 1;
  initialPlaybackRecovery.quality = fallbackQuality;
  selectedQuality.value = fallbackQuality;
  initialPlaybackRecoveryRunning = false;
  // 自動復旧は一度だけ。以降は通常のブラウザ側エラー表示に任せる。
  initialPlaybackRecovery = null;
}

const endedHandler = {
  fn: async () => {
    try { emit('ended'); } catch (e) {}
    try { pushToAutoplayHistory(props.videoId); } catch (e) {}
    if (!autoplayEnabled.value) return;
    try {
      const candId = getAutoplayCandidateId();
      if (!candId) return;
      emit('play-autoplay-candidate', { id: candId });
    } catch (e) {}
  }
};

let _onEnded = async () => { await endedHandler.fn(); };

// 自動再生候補選定
// window.__autoplayCandidates があればそこから選ぶ。ないなら DOM の data-video-id から選ぶ。
function getAutoplayCandidateId() {
  return selectAutoplayCandidateId(props.videoId, {
    onNoSuitableVideo: () => emit('autoplay-no-suitable-video'),
  });
}

function handleAutoplaySettingChange(event) {
  const enabled = event?.detail?.enabled;
  const nextEnabled = typeof enabled === 'boolean' ? enabled : loadAutoplay();
  if (nextEnabled && repeatEnabled.value) repeatEnabled.value = false;
  autoplayEnabled.value = nextEnabled;
  applyRepeatAndAutoplay();
  if (autoplayEnabled.value) scheduleAutoplay();
  else cancelAutoplay();
}

function updatePictureInPictureState() {
  const video = videoRef.value;
  pictureInPictureActive.value = Boolean(
    video && (
      document.pictureInPictureElement === video ||
      video.webkitPresentationMode === 'picture-in-picture'
    )
  );
}

function attachPictureInPictureListeners(video) {
  if (!video) return;
  video.addEventListener('enterpictureinpicture', updatePictureInPictureState);
  video.addEventListener('leavepictureinpicture', updatePictureInPictureState);
  video.addEventListener('webkitpresentationmodechanged', updatePictureInPictureState);
}

function detachPictureInPictureListeners(video) {
  if (!video) return;
  video.removeEventListener('enterpictureinpicture', updatePictureInPictureState);
  video.removeEventListener('leavepictureinpicture', updatePictureInPictureState);
  video.removeEventListener('webkitpresentationmodechanged', updatePictureInPictureState);
}

async function togglePictureInPicture() {
  const video = videoRef.value;
  if (!video || !pictureInPictureSupported.value) return;

  try {
    if (
      document.pictureInPictureEnabled &&
      typeof video.requestPictureInPicture === 'function'
    ) {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
        await video.requestPictureInPicture();
      }
    } else if (typeof video.webkitSetPresentationMode === 'function') {
      const nextMode = video.webkitPresentationMode === 'picture-in-picture'
        ? 'inline'
        : 'picture-in-picture';
      video.webkitSetPresentationMode(nextMode);
    }
    updatePictureInPictureState();
  } catch (pipError) {
    console.warn('Picture-in-Picture failed:', pipError);
  }
}

const nativeHlsSupported = ref(false);
const hasM3u8 = ref(false);

onMounted(() => {
  void updateStreamServerStatus();
  streamStatusTimer = window.setInterval(
    updateStreamServerStatus,
    STREAM_STATUS_INTERVAL_MS,
  );
  statusClockTimer = window.setInterval(() => {
    statusClock.value = Date.now();
  }, 1_000);

  // ブラウザがネイティブに m3u8 を扱えるか判定
  try {
    const tv = document.createElement('video');
    const can1 = tv.canPlayType && tv.canPlayType('application/vnd.apple.mpegurl');
    const can2 = tv.canPlayType && tv.canPlayType('application/x-mpegURL');
    nativeHlsSupported.value = !!(can1 || can2);
  } catch (e) {
    nativeHlsSupported.value = false;
  }

  if (videoRef.value) {
    videoRef.value.addEventListener('mousemove', showSettingsBox);
    videoRef.value.addEventListener('click', showSettingsBox);
    // ended リスナを初期化時に追加
    try {
      videoRef.value.addEventListener('ended', _onEnded);
      _onEndedAttached = true;
    } catch (e) {}
    // その他設定を反映
    applyRepeatAndAutoplay();
  }

  window.addEventListener('mousemove', showSettingsBox);
  window.addEventListener('click', showSettingsBox);
  window.addEventListener('scroll', showSettingsBox);
  window.addEventListener(AUTOPLAY_SETTING_EVENT, handleAutoplaySettingChange);
  // attach loop timeupdate handler if video element exists
  try {
    if (videoRef.value) videoRef.value.addEventListener('timeupdate', onTimeUpdateLoopHandler);
  } catch (e) {}
});

onBeforeUnmount(() => {
  if (streamStatusTimer !== null) window.clearInterval(streamStatusTimer);
  if (statusClockTimer !== null) window.clearInterval(statusClockTimer);
  streamStatusTimer = null;
  statusClockTimer = null;
  clearInitialPlaybackRecovery();
  clearM3u8LoadTimeout();
  destroyHls();
  revokeSubtitleTracks(subtitleTracks.value);
  try { cancelAutoplay(); } catch (e) {}
  try { detachBufferListeners(); } catch (e) {}
  try { detachLoopBufferListeners(); } catch (e) {}
  try { detachPictureInPictureListeners(videoRef.value); } catch (e) {}
  try {
    window.removeEventListener('mousemove', showSettingsBox);
    window.removeEventListener('click', showSettingsBox);
    window.removeEventListener('scroll', showSettingsBox);
    window.removeEventListener(AUTOPLAY_SETTING_EVENT, handleAutoplaySettingChange);
  } catch (e) {}
  try {
    if (videoRef.value) videoRef.value.removeEventListener('timeupdate', onTimeUpdateLoopHandler);
  } catch (e) {}
});

// 再生時に m3u8 を使うべきか（Apple はそのまま、非 Apple は nativeHlsSupported を確認）
function isAppleDevice() {
  return isAppleDeviceCheck();
}
function useM3u8Playback() {
  try {
    if (m3u8PlaybackDisabled.value) return false;
    if (!hasM3u8.value) return false;
    if (isAppleDevice()) return true;
    return nativeHlsSupported.value === true || Boolean(HlsConstructor?.isSupported());
  } catch (e) { return false; }
}

function clearM3u8LoadTimeout() {
  if (m3u8LoadTimer !== null) {
    window.clearTimeout(m3u8LoadTimer);
    m3u8LoadTimer = null;
  }
}

function isCurrentlyUsingM3u8() {
  if (m3u8PlaybackDisabled.value) return false;
  const sel = selectedQuality.value;
  const entry = sources.value[sel];
  if (!entry) return false;
  if (isM3u8Source(entry)) return true;
  if (Array.isArray(entry.sources) && entry.sources.some(isM3u8Source)) {
    if (useM3u8Playback()) {
      const activeList = getSingleStreamSources(entry);
      return activeList.some(isM3u8Source);
    }
  }
  if (entry.video?.sources?.some(isM3u8Source) || isM3u8Source(entry.video)) {
    return true;
  }
  return false;
}

function startM3u8LoadTimeout() {
  clearM3u8LoadTimeout();
  if (m3u8PlaybackDisabled.value || !isCurrentlyUsingM3u8()) return;

  m3u8LoadTimer = window.setTimeout(() => {
    handleM3u8LoadTimeout();
  }, M3U8_LOAD_TIMEOUT_MS);
}

async function handleM3u8LoadTimeout() {
  m3u8LoadTimer = null;
  // 既に動画が正常に再生中であればフォールバック不要
  if (
    videoRef.value &&
    !videoRef.value.paused &&
    videoRef.value.currentTime > 0 &&
    !playerBuffering.value &&
    playerReady.value
  ) {
    return;
  }
  if (m3u8PlaybackDisabled.value) return;

  console.warn("m3u8 load timeout (10s) exceeded or m3u8 failed. Falling back to non-m3u8 sources for all browsers.");
  m3u8PlaybackDisabled.value = true;
  destroyHls();

  let prevTime = 0;
  try {
    if (videoRef.value) prevTime = videoRef.value.currentTime || 0;
  } catch (e) {}

  // 非m3u8で再生可能な最適な画質を選択する（空URLの画質は除外される）
  const bestQuality = selectBestPlayableQuality(
    sources.value,
    availableQualities.value,
    selectedQuality.value,
    { useM3u8: false }
  );

  appleFallbackActive.value = false;
  appleSourceIndex.value = 0;
  playerReady.value = false;
  playerBuffering.value = false;

  if (bestQuality && bestQuality !== selectedQuality.value) {
    selectedQuality.value = bestQuality;
    return;
  }

  // 同じ画質内で非m3u8ソースに切り替える場合
  playerRenderKey.value += 1;
  await nextTick();
  const entry = sources.value[selectedQuality.value];
  if (videoRef.value && entry) {
    if (isSingleStreamEntry(entry)) {
      applyVideoSources(videoRef.value, getSingleStreamSources(entry));
    } else if (entry.video) {
      applyVideoSources(videoRef.value, getVideoSourcesForEntry(entry));
    }
    try {
      if (prevTime > 0) videoRef.value.currentTime = prevTime;
    } catch (e) {}
    if (autoplayEnabled.value) {
      videoRef.value.play().catch(() => {});
    }
  }
}

function isSingleStreamEntry(entry) {
  try {
    const list = getSingleStreamSources(entry);
    return Array.isArray(list) && list.length > 0;
  } catch (e) { return false; }
}

function getSingleStreamSources(entry) {
  return getSingleStreamSourcesList(entry, {
    isApple: isAppleDevice(),
    fallbackActive: appleFallbackActive.value,
    sourceIndex: appleSourceIndex.value,
    useM3u8: useM3u8Playback(),
  });
}

function getCandidateSourcesForCurrentQuality() {
  const sel = selectedQuality.value;
  const entry = sources.value[sel];
  if (!entry) return [];
  if (isSingleStreamEntry(entry)) {
    return getSingleStreamSourcesList(entry, {
      isApple: false,
      fallbackActive: false,
      useM3u8: useM3u8Playback(),
    });
  } else if (entry.video) {
    return getVideoSourcesForEntryList(entry, {
      isApple: false,
      fallbackActive: false,
    });
  }
  return [];
}

function tryNextAppleSource() {
  if (!isAppleDevice()) return false;
  const candidateSources = getCandidateSourcesForCurrentQuality();
  if (!candidateSources || candidateSources.length <= 1) {
    return false;
  }

  const now = Date.now();
  if (now - lastAppleFallbackAttemptTime < 150) {
    return true;
  }
  lastAppleFallbackAttemptTime = now;

  if (!appleFallbackActive.value) {
    appleFallbackActive.value = true;
    appleSourceIndex.value = 1 < candidateSources.length ? 1 : 0;
  } else {
    appleSourceIndex.value += 1;
  }

  if (appleSourceIndex.value < candidateSources.length) {
    const entry = sources.value[selectedQuality.value];
    if (entry?.video) {
      entry.video._appleFallbackActive = true;
      entry.video._appleSourceIndex = appleSourceIndex.value;
    }
    playerReady.value = false;
    playerBuffering.value = false;
    playerRenderKey.value += 1;
    scheduleInitialPlaybackRecovery();

    const currentSource = candidateSources[appleSourceIndex.value];
    nextTick(() => {
      if (!videoRef.value || !currentSource) return;
      applyVideoSources(videoRef.value, [currentSource]);
      if (autoplayEnabled.value) {
        try {
          videoRef.value.play().catch(() => {});
        } catch (e) {}
      }
    });
    return true;
  }

  return false;
}

function handleVideoError() {
  if (isAppleDevice()) {
    const handled = tryNextAppleSource();
    if (handled) return;
  }
  if (isCurrentlyUsingM3u8()) {
    handleM3u8LoadTimeout();
    return;
  }
  scheduleInitialPlaybackRecovery();
}

function handleSourceError() {
  if (isAppleDevice()) {
    const handled = tryNextAppleSource();
    if (handled) return;
  }
  if (isCurrentlyUsingM3u8()) {
    handleM3u8LoadTimeout();
    return;
  }
}

function applyVideoSources(videoEl, sourcesList) {
  if (!videoEl) return;
  try {
    destroyHls();
    videoEl.querySelectorAll(":scope > source").forEach((source) => source.remove());
    const hlsSource = !m3u8PlaybackDisabled.value && sourcesList.find((source) => source?.isM3u8 && source.url);
    const progressiveSources = sourcesList.filter((source) => !source?.isM3u8);
    const nativeHls = !m3u8PlaybackDisabled.value && (
      videoEl.canPlayType("application/vnd.apple.mpegurl") ||
      videoEl.canPlayType("application/x-mpegURL")
    );
    if (hlsSource && progressiveSources.length === 0 && !nativeHls && HlsConstructor?.isSupported()) {
      hlsInstance = new HlsConstructor();
      hlsInstance.on(HlsConstructor.Events.ERROR, (event, data) => {
        if (data && data.fatal) {
          handleM3u8LoadTimeout();
        }
      });
      hlsInstance.loadSource(hlsSource.url);
      hlsInstance.attachMedia(videoEl);
      startM3u8LoadTimeout();
      return;
    }
    const playableSources = (nativeHls && !m3u8PlaybackDisabled.value) || progressiveSources.length === 0
      ? sourcesList
      : progressiveSources;
    for (const s of playableSources) {
      if (!s?.url) continue;
      if (m3u8PlaybackDisabled.value && s.isM3u8) continue;
      const sourceEl = document.createElement("source");
      sourceEl.src = s.url;
      if (s.mimeType) sourceEl.type = s.mimeType;
      sourceEl.addEventListener("error", handleSourceError);
      videoEl.appendChild(sourceEl);
    }
    videoEl.load();
    if (isCurrentlyUsingM3u8()) {
      startM3u8LoadTimeout();
    }
  } catch (e) {}
}

function applySubtitleTracks(videoEl, tracks) {
  if (!videoEl) return;
  try {
    videoEl.querySelectorAll(":scope > track[data-type2-subtitle]").forEach((track) => track.remove());
    for (const track of Array.isArray(tracks) ? tracks : []) {
      if (!track?.src) continue;
      const trackEl = document.createElement("track");
      trackEl.dataset.type2Subtitle = "1";
      trackEl.src = track.src;
      trackEl.srclang = track.srclang || "ja";
      trackEl.label = track.label || trackEl.srclang;
      trackEl.kind = track.kind || "subtitles";
      trackEl.default = Boolean(track.default);
      videoEl.appendChild(trackEl);
    }
  } catch (e) {}
}

function isAudioOnlyEntry(entry) {
  try {
    return !!(entry && entry.audio && !entry.video && !entry.url);
  } catch (e) { return false; }
}

function getVideoSourcesForEntry(entry) {
  return getVideoSourcesForEntryList(entry, {
    isApple: isAppleDevice(),
    fallbackActive: appleFallbackActive.value,
    sourceIndex: appleSourceIndex.value,
  });
}

function preferH264First(list) {
  try {
    if (!Array.isArray(list) || list.length <= 1) return list || [];
    const isH264 = (s) => {
      const mt = (s && s.mimeType) ? String(s.mimeType).toLowerCase() : "";
      const url = (s && s.url) ? String(s.url).toLowerCase() : "";
      if (mt.includes("video/mp4")) return true;
      if (mt.includes("avc1") || mt.includes("h264")) return true;
      if (url.endsWith(".mp4")) return true;
      if (url.includes("codecs=avc1") || url.includes("codecs%3davc1")) return true;
      return false;
    };
    return list.slice().sort((a, b) => {
      const aw = isH264(a) ? 1 : 0;
      const bw = isH264(b) ? 1 : 0;
      return bw - aw;
    });
  } catch (e) {
    return list || [];
  }
}

function getBufferedAhead(el) {
  try {
    if (!el || !el.buffered) return 0;
    const cur = el.currentTime || 0;
    const buf = el.buffered;
    for (let i = buf.length - 1; i >= 0; i--) {
      const start = buf.start(i);
      const end = buf.end(i);
      if (end > cur) {
        if (start <= cur) return end - cur;
        return end - cur;
      }
    }
    return 0;
  } catch (e) { return 0; }
}

function showSettingsBox() {
  try {
    settingsVisible.value = true;
    clearTimeout(showSettingsBox._hideTimer);
    showSettingsBox._hideTimer = setTimeout(() => { settingsVisible.value = false; }, 3000);
  } catch (e) {}
}
showSettingsBox._hideTimer = null;

function checkAndResumeIfBuffered() {
  const vAhead = getBufferedAhead(videoRef.value);
  const aAhead = audioRef.value ? getBufferedAhead(audioRef.value) : vAhead;
  if (_buffering && vAhead >= BUFFER_RESUME_SECONDS && aAhead >= BUFFER_RESUME_SECONDS) {
    _buffering = false;
    try { if (videoRef.value) videoRef.value.play(); } catch (e) {}
    try { if (audioRef.value) audioRef.value.play(); } catch (e) {}
    // 再開後にバッファリスナーをデタッチする
    detachBufferListeners();
  }
}

let _bufferListenersAttached = false;
function attachBufferListeners() {
  if (_bufferListenersAttached) return;
  try {
    if (videoRef.value) {
      videoRef.value.addEventListener('waiting', onWaiting);
      videoRef.value.addEventListener('progress', onProgress);
      videoRef.value.addEventListener('playing', onPlaying);
    }
    if (audioRef.value) {
      audioRef.value.addEventListener('waiting', onWaiting);
      audioRef.value.addEventListener('progress', onProgress);
      audioRef.value.addEventListener('playing', onPlaying);
    }
    _bufferListenersAttached = true;
  } catch (e) {}
}

function detachBufferListeners() {
  if (!_bufferListenersAttached) return;
  try {
    if (videoRef.value) {
      videoRef.value.removeEventListener('waiting', onWaiting);
      videoRef.value.removeEventListener('progress', onProgress);
      videoRef.value.removeEventListener('playing', onPlaying);
    }
    if (audioRef.value) {
      audioRef.value.removeEventListener('waiting', onWaiting);
      audioRef.value.removeEventListener('progress', onProgress);
      audioRef.value.removeEventListener('playing', onPlaying);
    }
  } catch (e) {}
  _bufferListenersAttached = false;
}

function onWaiting() {
  _buffering = true;
  attachBufferListeners();
  if (isCurrentlyUsingM3u8()) {
    startM3u8LoadTimeout();
  }
}

function onProgress() {
  if (!_buffering) return;
  checkAndResumeIfBuffered();
}

function onPlaying() {
  _buffering = false;
  clearM3u8LoadTimeout();
  detachBufferListeners();
}

function handleUnmuteClick() {
  try { localStorage.setItem(USER_GESTURE_KEY, '1'); } catch (e) {}
  showUnmutePrompt.value = false;
  try {
    if (videoRef.value) { videoRef.value.muted = false; videoRef.value.play(); }
    if (audioRef.value) { audioRef.value.muted = false; audioRef.value.play(); }
  } catch (e) {}
}

function onFirstUserGesture() {
  try { localStorage.setItem(USER_GESTURE_KEY, '1'); } catch (e) {}
  showUnmutePrompt.value = false;
  try {
    if (videoRef.value) { videoRef.value.muted = false; videoRef.value.play(); }
    if (audioRef.value) { audioRef.value.muted = false; audioRef.value.play(); }
  } catch (e) {}
}

function scheduleAutoplay() {
  try { if (_autoplayTimer) { clearTimeout(_autoplayTimer); _autoplayTimer = null; } } catch (e) {}
  if (!autoplayEnabled.value) return;
  _autoplayTimer = setTimeout(() => {
    try {
      if (videoRef.value) videoRef.value.play();
      if (audioRef.value) audioRef.value.play();
    } catch (e) {}
    _autoplayTimer = null;
  }, AUTOPLAY_DELAY_MS);
}

function cancelAutoplay() {
  try { if (_autoplayTimer) { clearTimeout(_autoplayTimer); _autoplayTimer = null; } } catch (e) {}
}

// 00:00で再生再開させたい
function onTimeUpdateLoopHandler() {
  try {
    if (!videoRef.value) return;
    if (repeatEnabled.value) {
      const cur = videoRef.value.currentTime || 0;
      if (cur <= 0.12 && videoRef.value.paused) {
        startLoopResume();
      }
    }
  } catch (e) {}
}

function startLoopResume() {
  try { cancelLoopResume(); } catch (e) {}
  _loopResumeTimer = setTimeout(() => {
    try { attemptResumeLoop(); } catch (e) {}
  }, LOOP_BUFFER_SECONDS * 1000);
}

function cancelLoopResume() {
  try { if (_loopResumeTimer) { clearTimeout(_loopResumeTimer); _loopResumeTimer = null; } } catch (e) {}
  detachLoopBufferListeners();
}

function attemptResumeLoop() {
  const vAhead = getBufferedAhead(videoRef.value);
  const aAhead = audioRef.value ? getBufferedAhead(audioRef.value) : vAhead;
  if (vAhead >= LOOP_BUFFER_SECONDS && aAhead >= LOOP_BUFFER_SECONDS) {
    try { if (videoRef.value) videoRef.value.play(); } catch (e) {}
    try { if (audioRef.value) audioRef.value.play(); } catch (e) {}
    cancelLoopResume();
  } else {
    attachLoopBufferListeners();
  }
}

function attachLoopBufferListeners() {
  if (_loopBufferListenersAttached) return;
  try {
    if (videoRef.value) {
      videoRef.value.addEventListener('progress', onLoopBufferProgress);
      videoRef.value.addEventListener('playing', onLoopBufferProgress);
    }
    if (audioRef.value) {
      audioRef.value.addEventListener('progress', onLoopBufferProgress);
      audioRef.value.addEventListener('playing', onLoopBufferProgress);
    }
    _loopBufferListenersAttached = true;
  } catch (e) {}
}

function detachLoopBufferListeners() {
  if (!_loopBufferListenersAttached) return;
  try {
    if (videoRef.value) {
      videoRef.value.removeEventListener('progress', onLoopBufferProgress);
      videoRef.value.removeEventListener('playing', onLoopBufferProgress);
    }
    if (audioRef.value) {
      audioRef.value.removeEventListener('progress', onLoopBufferProgress);
      audioRef.value.removeEventListener('playing', onLoopBufferProgress);
    }
  } catch (e) {}
  _loopBufferListenersAttached = false;
}

function onLoopBufferProgress() {
  try {
    const vAhead = getBufferedAhead(videoRef.value);
    const aAhead = audioRef.value ? getBufferedAhead(audioRef.value) : vAhead;
    if (vAhead >= LOOP_BUFFER_SECONDS && aAhead >= LOOP_BUFFER_SECONDS) {
      try { if (videoRef.value) videoRef.value.play(); } catch (e) {}
      try { if (audioRef.value) audioRef.value.play(); } catch (e) {}
      cancelLoopResume();
    }
  } catch (e) {}
}

// 繰り返し再生が選ばれた時
watch(repeatEnabled, (newVal) => {
  try {
    if (newVal) {
      // if repeat turned on, disable autoplay and clear any scheduled autoplay
      autoplayEnabled.value = false;
      try { cancelAutoplay(); } catch (e) {}
    } else {
      // if repeat turned off, leave autoplay as user-configured; do not force change
      // if sources ready, schedule autoplay
      try {
        if (autoplayEnabled.value) scheduleAutoplay();
      } catch (e) {}
    }
  } catch (e) {}
});

// persist autoplay setting across videos
watch(autoplayEnabled, (val) => {
  try { saveAutoplay(!!val); } catch (e) {}
});

function clearType2SrcRepeated() {
  let count = 0;
  const interval = setInterval(() => {
    try {
      if (videoRef.value) {
        videoRef.value.removeAttribute("src");
        videoRef.value.load();
      }
      if (audioRef.value) {
        audioRef.value.removeAttribute("src");
        audioRef.value.load();
      }
    } catch (e) {}
    count++;
    if (count >= 2) {
      clearInterval(interval);
    }
  }, 200);
}

function reloadSrc() {
  const sel = selectedQuality.value;
  const entry = sources.value[sel];
  if (!entry) return;

  if (isSingleStreamEntry(entry)) {
    // single-stream
    if (videoRef.value) {
      applyVideoSources(videoRef.value, getSingleStreamSources(entry));
    }
    if (audioRef.value) {
      const aSource = audioRef.value.querySelector('source');
      if (aSource) aSource.removeAttribute('src');
      audioRef.value.removeAttribute('src');
      audioRef.value.load();
    }
  } else if (isAudioOnlyEntry(entry)) {
    if (audioRef.value && entry.audio.url) {
      const source = audioRef.value.querySelector('source');
      if (source) {
        source.src = entry.audio.url;
        if (entry.audio.mimeType) source.type = entry.audio.mimeType;
      } else {
        audioRef.value.src = entry.audio.url;
      }
      audioRef.value.load();
    }
  } else if (entry.video) {
    // video+audio
    if (videoRef.value) {
      applyVideoSources(videoRef.value, getVideoSourcesForEntry(entry));
    }
    if (audioRef.value && entry.audio.url) {
      const source = audioRef.value.querySelector('source');
      if (source) source.src = entry.audio.url;
      audioRef.value.load();
    }
  }
}

function checkPlayback() {
  if (videoRef.value) {
    videoRef.value.play().catch(() => {
      if (isAppleDevice() && tryNextAppleSource()) {
        return;
      }
      reloadSrc();
    });
  }
  if (audioRef.value) {
    audioRef.value.play().catch(() => {
      reloadSrc();
    });
  }
}

// single-stream 切替時の共通セットアップ（再生位置を維持）
function applyHlsSetup(prevTime = 0) {
  destroyHls();
  isQualitySwitching.value = true;
  setTimeout(() => { isQualitySwitching.value = false; }, 1000);

  // pause before src swap (テンプレート側で :key により再レンダリングされる)
  try { if (videoRef.value) { prevTime = videoRef.value.currentTime || prevTime; videoRef.value.pause(); } } catch (e) {}
  try {
    if (audioRef.value) {
      audioRef.value.pause();
      const aSource = audioRef.value.querySelector('source');
      if (aSource) aSource.removeAttribute('src');
      audioRef.value.removeAttribute('src');
      audioRef.value.load();
    }
  } catch (e) {}

  nextTick(() => {
    const entry = sources.value[selectedQuality.value];
    if (videoRef.value && isSingleStreamEntry(entry)) {
      applyVideoSources(videoRef.value, getSingleStreamSources(entry));
      markPlayerReady();
    }
    // 再レンダリング後に時間を復元して再生を試みる
    try {
      if (videoRef.value) {
        // HLS は currentTime 設定が成功しないこともあるため複数回試す
        videoRef.value.currentTime = prevTime;
        setTimeout(() => { try { if (videoRef.value) videoRef.value.currentTime = prevTime; } catch (e) {} }, 250);
      }
    } catch (e) {}

    // ended リスナを再attach
    if (videoRef.value) {
      try {
        videoRef.value.removeEventListener('ended', _onEnded);
        videoRef.value.addEventListener('ended', _onEnded);
        _onEndedAttached = true;
      } catch (e) {}
    }

    const granted2 = (() => { try { return localStorage.getItem(USER_GESTURE_KEY) === '1'; } catch (e) { return false; } })();

    try {
      if (videoRef.value) {
        videoRef.value.muted = !granted2;
        if (autoplayEnabled.value) scheduleAutoplay();
      }
      if (audioRef.value) {
        audioRef.value.muted = !granted2;
        if (autoplayEnabled.value) scheduleAutoplay();
      }
      attachBufferListeners();
      showUnmutePrompt.value = !granted2;
      if (!granted2) {
        window.addEventListener('click', onFirstUserGesture, { once: true });
        window.addEventListener('touchstart', onFirstUserGesture, { once: true });
      } else {
        scheduleAutoplay();
      }
    } catch (e) {}
    // Add playback check for HLS
    if (videoRef.value) {
      videoRef.value.addEventListener('canplay', checkPlayback, { once: true });
    }
  });
}

// selectedQuality の監視: 選択先が HLS(url) を持つかどうかで挙動を分ける
watch(selectedQuality, (newQuality) => {
  playerReady.value = false;
  playerBuffering.value = false;
  appleFallbackActive.value = false;
  appleSourceIndex.value = 0;
  clearM3u8LoadTimeout();
  if (
    initialPlaybackRecovery &&
    !initialPlaybackRecoveryRunning &&
    newQuality &&
    newQuality !== initialPlaybackRecovery.quality
  ) {
    clearInitialPlaybackRecovery();
  }
  const sel = selectedQuality.value;
  const entry = sources.value[sel];

  if (!entry) return;

  if (isCurrentlyUsingM3u8()) {
    startM3u8LoadTimeout();
  }

  // If entry has single-stream URL and device can use it
  if (isSingleStreamEntry(entry)) {
    // preserve position and apply HLS setup
    let prevTime = 0;
    try { if (videoRef.value) prevTime = videoRef.value.currentTime || 0; } catch (e) {}
    applyHlsSetup(prevTime);
    return;
  }

  // Audio-only
  if (isAudioOnlyEntry(entry)) {
    isQualitySwitching.value = true;
    setTimeout(() => { isQualitySwitching.value = false; }, 1000);
    nextTick(() => {
      try {
        if (audioRef.value && entry.audio?.url) {
          const source = audioRef.value.querySelector('source');
          if (source) {
            source.src = entry.audio.url;
            if (entry.audio.mimeType) source.type = entry.audio.mimeType;
          } else {
            audioRef.value.src = entry.audio.url;
          }
          audioRef.value.load();
          markPlayerReady();
        }
      } catch (e) {}
      applyRepeatAndAutoplay();
      const granted2 = (() => { try { return localStorage.getItem(USER_GESTURE_KEY) === '1'; } catch (e) { return false; } })();
      try {
        if (audioRef.value) {
          audioRef.value.muted = !granted2;
          if (autoplayEnabled.value) scheduleAutoplay();
        }
        attachBufferListeners();
        showUnmutePrompt.value = !granted2;
        if (!granted2) {
          window.addEventListener('click', onFirstUserGesture, { once: true });
          window.addEventListener('touchstart', onFirstUserGesture, { once: true });
        } else {
          scheduleAutoplay();
        }
      } catch (e) {}
      if (audioRef.value) {
        audioRef.value.addEventListener('canplay', checkPlayback, { once: true });
      }
    });
    return;
  }

  // Otherwise use legacy video+audio sync flow (entry.video must exist)
  if (entry.video) {
    // Force element re-create for separated AV (Safari/iOS cache issues)
    separateAvKey.value += 1;
    isQualitySwitching.value = true;
    setTimeout(() => {
      isQualitySwitching.value = false;
    }, 4000);
    let prevTime = 0;
    if (videoRef.value) {
      prevTime = videoRef.value.currentTime;
      videoRef.value.pause();
    }
    if (audioRef.value) {
      audioRef.value.pause();
    }
    nextTick(() => {
      clearType2SrcRepeated();
      setupSyncPlayback(
        videoRef.value,
        audioRef.value,
        sources,
        selectedQuality,
        diffText,
        selectedPlaybackRate
      );
      if (videoRef.value || audioRef.value) markPlayerReady();
      applyRepeatAndAutoplay();
      
      // ended リスナを再attach
      if (videoRef.value) {
        try {
          videoRef.value.removeEventListener('ended', _onEnded);
          videoRef.value.addEventListener('ended', _onEnded);
          _onEndedAttached = true;
        } catch (e) {}
      }
      
      const granted2 = (() => { try { return localStorage.getItem(USER_GESTURE_KEY) === '1'; } catch (e) { return false; } })();
      try {
        if (videoRef.value) {
          videoRef.value.muted = !granted2;
          if (autoplayEnabled.value) scheduleAutoplay();
        }
        if (audioRef.value) {
          audioRef.value.muted = !granted2;
          if (autoplayEnabled.value) scheduleAutoplay();
        }
        attachBufferListeners();
        showUnmutePrompt.value = !granted2;
        if (!granted2) {
          window.addEventListener('click', onFirstUserGesture, { once: true });
          window.addEventListener('touchstart', onFirstUserGesture, { once: true });
        } else {
          scheduleAutoplay();
        }
      } catch (e) {}
      // Add playback check for video+audio
      if (videoRef.value) {
        videoRef.value.addEventListener('canplay', checkPlayback, { once: true });
      }
      if (audioRef.value) {
        audioRef.value.addEventListener('canplay', checkPlayback, { once: true });
      }
      setTimeout(() => {
        try {
          if (videoRef.value) videoRef.value.currentTime = prevTime;
          if (audioRef.value) audioRef.value.currentTime = prevTime;
        } catch (e) {}
        setTimeout(() => {
          try {
            if (videoRef.value) videoRef.value.currentTime = prevTime;
            if (audioRef.value) audioRef.value.currentTime = prevTime;
          } catch (e) {}
        }, 600);
      }, 600);
    });
  }
});

function applyRepeatAndAutoplay() {
  if (videoRef.value) {
    videoRef.value.loop = !!repeatEnabled.value;
    videoRef.value.autoplay = !!autoplayEnabled.value;
    videoRef.value.playbackRate = selectedPlaybackRate.value;
  }
  if (audioRef.value) {
    audioRef.value.loop = !!repeatEnabled.value;
    audioRef.value.autoplay = !!autoplayEnabled.value;
    audioRef.value.playbackRate = selectedPlaybackRate.value;
  }
}

async function fetchStreamUrl(id, forceRefresh = false) {
  const sequence = ++streamRequestSequence;
  clearInitialPlaybackRecovery();
  clearM3u8LoadTimeout();
  m3u8PlaybackDisabled.value = false;
  destroyHls();
  appleFallbackActive.value = false;
  appleSourceIndex.value = 0;
  error.value = "";
  errorCode.value = "";
  errorExpiresAt.value = 0;
  sources.value = {};
  selectedQuality.value = "";
  selectedPlaybackRate.value = 1.0;
  diffText.value = "0";
  availableQualities.value = [];
  loading.value = true;
  playerReady.value = false;
  playerBuffering.value = false;
  hasM3u8.value = false;
  revokeSubtitleTracks(subtitleTracks.value);
  subtitleTracks.value = [];

  try {
    // タイプ2の全動画IDでAPIリクエスト間隔を共有する。
    while (true) {
      const cooldownMs = claimType2StreamRequestSlot();
      if (cooldownMs === 0) break;
      await new Promise((resolve) => window.setTimeout(resolve, cooldownMs));
      if (sequence !== streamRequestSequence || id !== props.videoId) return;
    }

    const data = await fetchStream(id, {
      forceRefresh,
      origin: "siatube",
      retries: 1,
      timeout: 30000,
    });
    if (sequence !== streamRequestSequence || id !== props.videoId) return;

    const locale = typeof navigator !== "undefined" ? navigator.language : "ja";
    const normalizedFormats = normalizeStreamFormats(data, locale);
    const hasHls = normalizedFormats.some((format) => format.isM3u8);
    if (hasHls && !nativeHlsSupported.value) {
      HlsConstructor = await loadHlsConstructor();
      if (sequence !== streamRequestSequence || id !== props.videoId) return;
    }

    const parsed = parseStream2Response({ formats: normalizedFormats });
    const rawSubtitleTracks = selectPlaybackSubtitleTracks(
      extractSubtitleTracks(data, locale)
    );
    localizeSubtitleTracks(rawSubtitleTracks).then((localizedTracks) => {
      if (sequence !== streamRequestSequence || id !== props.videoId) {
        revokeSubtitleTracks(localizedTracks);
        return;
      }
      revokeSubtitleTracks(subtitleTracks.value);
      subtitleTracks.value = localizedTracks;
      applySubtitleTracks(videoRef.value, localizedTracks);
    });
    if (!parsed || Object.keys(parsed.sources || {}).length === 0) {
      error.value = "利用可能なストリームがありません。";
      loading.value = false;
      return;
    }

    sources.value = parsed.sources;
    qualityLabels.value = parsed.qualityLabels || {};
    availableQualities.value = parsed.availableQualities || [];
    const preferred = (() => {
      try { return loadPreferredQuality(); } catch (e) { return "auto"; }
    })();
    const initialQuality = selectBestPlayableQuality(
      sources.value,
      availableQualities.value,
      preferred,
      { useM3u8: useM3u8Playback() }
    );
    selectedQuality.value = initialQuality || parsed.defaultQuality || availableQualities.value[0] || "";
    hasM3u8.value = !!parsed.hasM3u8;
    playerRenderKey.value += 1;
    beginInitialPlaybackRecovery(sequence, id, selectedQuality.value);
    if (isCurrentlyUsingM3u8()) {
      startM3u8LoadTimeout();
    }

    // 自動再生が有効なら候補IDだけ確認する（プリフェッチは行わない）
    try {
      if (autoplayEnabled.value) {
        // noop: 候補は ended 時にその場で選ぶ
        getAutoplayCandidateId();
      }
    } catch (e) {}

  } catch (err) {
    if (sequence !== streamRequestSequence || id !== props.videoId) return;
    loading.value = false;
    if (isVideoStreamError(err)) {
      errorCode.value = err.code || "";
      const expiresAt = Date.parse(err.payload?.expiresAt || "");
      errorExpiresAt.value = Number.isFinite(expiresAt) ? expiresAt : 0;
      error.value = err.payload?.message || err.message;
    } else if (err?.connectionFailure) {
      error.value = err.message;
    } else if (err && err.name === 'AbortError') {
      error.value = "ストリームURLの取得に失敗しました (タイムアウト)";
    } else {
      error.value = "ストリームURLの取得に失敗しました (fetch error)";
    }
    sources.value = {};
    availableQualities.value = [];
    selectedQuality.value = "";
  } finally {
    if (sequence === streamRequestSequence) loading.value = false;
  }
}

function markPlayerReady(event) {
  playerReady.value = true;
  playerBuffering.value = false;
  if (
    event?.currentTarget &&
    isPrimaryMediaElement(event.currentTarget) &&
    hasPlayableDuration(event.currentTarget)
  ) {
    clearInitialPlaybackRecovery();
  }
  if (videoRef.value && videoRef.value.readyState >= 3) {
    clearM3u8LoadTimeout();
  }
}

function markPlayerPlaying(event) {
  playerReady.value = true;
  playerBuffering.value = false;
  clearM3u8LoadTimeout();
  if (event?.currentTarget && isPrimaryMediaElement(event.currentTarget)) {
    clearInitialPlaybackRecovery();
  }
}

function markPlayerBuffering() {
  if (playerReady.value) playerBuffering.value = true;
  if (isCurrentlyUsingM3u8()) {
    startM3u8LoadTimeout();
  }
}

watch(
  () => props.videoId,
  (newId) => {
    if (newId) {
      fetchStreamUrl(newId);
    } else {
      // videoId が空のときは取得をスキップ
    }
  },
  { immediate: true }
);

watch(selectedPlaybackRate, () => {
  if (videoRef.value) videoRef.value.playbackRate = selectedPlaybackRate.value;
  if (audioRef.value) audioRef.value.playbackRate = selectedPlaybackRate.value;
});

// videoRef の変化を監視して ended リスナの attach/detach を行う
watch(videoRef, (newEl, oldEl) => {
  detachPictureInPictureListeners(oldEl);
  if (oldEl && _onEndedAttached) {
    try { oldEl.removeEventListener('ended', _onEnded); } catch (e) {}
    _onEndedAttached = false;
  }
  if (newEl) {
    try {
      attachPictureInPictureListeners(newEl);
      updatePictureInPictureState();
      // リスナ追加前に既存のものがあれば削除
      newEl.removeEventListener('ended', _onEnded);
      newEl.addEventListener('ended', _onEnded);
      _onEndedAttached = true;
      applySubtitleTracks(newEl, subtitleTracks.value);
    } catch (e) {}
  }
  if (!newEl) pictureInPictureActive.value = false;
}, { flush: 'post' });

</script>

<style scoped>
.error-box {
  box-sizing: border-box;
  width: 100%;
  min-height: 140px;
  padding: 24px 28px;
  border: 2px solid #d9534f;
  border-radius: 12px;
  background: #fff1f0;
  color: #8b1a1a;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.7;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 14px;
}

.error-title {
  font-size: 20px;
  font-weight: 800;
}

.error-message {
  max-width: 760px;
}

.error-box.premiere-scheduled {
  min-height: 220px;
  padding: 0 0 26px;
  border: 1px solid var(--text-secondary);
  border-radius: 2px;
  background: transparent;
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.18);
  align-items: center;
  text-align: center;
  gap: 16px;
  overflow: hidden;
}

.error-box.premiere-scheduled .error-title {
  box-sizing: border-box;
  width: 100%;
  padding: 11px 16px;
  background: transparent;
  color: #fff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: clamp(18px, 2.5vw, 23px);
  line-height: 1.3;
}

.error-box.premiere-scheduled .error-title::before {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin: 0 10px 2px 0;
  border-radius: 50%;
  background: #d22;
  content: "";
}

.error-box.premiere-scheduled .error-message {
  padding: 4px 22px 0;
  color: #fff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: clamp(15px, 2vw, 18px);
  line-height: 1.6;
}

.premiere-scheduled-at {
  padding: 8px 16px;
  border: 1px solid var(--text-secondary);
  border-radius: 2px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  font-weight: 700;
}

.error-box .reload-button {
  width: auto;
  min-width: 120px;
  margin-top: 0;
  padding: 9px 20px;
  font-size: 14px;
}

.error-box.premiere-scheduled .reload-button {
  border: 1px solid var(--text-secondary);
  border-radius: 2px;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.error-box.premiere-scheduled .reload-button:hover {
  background: var(--hover-bg);
}

@media (max-width: 600px) {
  .error-box.premiere-scheduled {
    min-height: 210px;
    padding: 0 0 24px;
  }

  .premiere-scheduled-at {
    max-width: calc(100% - 32px);
    font-size: 14px;
  }
}

.stream-status-panel {
  min-width: min(420px, calc(100vw - 48px));
  padding: 16px 20px;
  border: 1px solid rgb(255 255 255 / 0.35);
  border-radius: 10px;
  background: rgb(0 0 0 / 0.72);
  color: #fff;
  text-align: center;
  line-height: 1.6;
}

.stream-status-title {
  font-size: 16px;
  font-weight: 700;
}

.stream-status-detail {
  margin-top: 4px;
  color: #b9ddff;
  font-size: 14px;
}

.stream-status-wait {
  margin-top: 6px;
  color: #ffe08a;
  font-size: 15px;
  font-weight: 700;
}

.video-container {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
}
.video-container video,
.video-container audio {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.audio-only {
  position: relative;
  width: 100%;
  height: auto;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.audio-only audio {
  padding-top: 200px;
  display: block;
  position: static;
  width: 100%;
  height: 48px;
}
.settings-box {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 20;
  background: rgba(0, 0, 0, 0.75);
  color: var(--on-accent);
  padding: 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  transition: opacity 0.3s ease;
}
.selector {
  background: var(--ui-dark);
  color: var(--on-accent);
  border: 1px solid var(--border-color);
  padding: 4px 8px;
  border-radius: 6px;
  margin-left: 6px;
}
.reload-button {
  margin-top: 6px;
  padding: 6px 15px;
  font-size: 9px;
  background: var(--text-type2-reload);
  color: var(--on-accent);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: 60%;
}
.reload-button:hover {
  background: var(--text-secondary-hover);
}
.pip-button {
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: var(--text-type2-reload);
  color: var(--on-accent);
  font-size: 11px;
  cursor: pointer;
}
.pip-button:hover:not(:disabled) {
  background: var(--text-secondary-hover);
}
.pip-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
audio {
  display: none;
}
.block-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.315);
  pointer-events: all;
}

.unmute-prompt {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(128,128,128,0.6);
  color: var(--on-accent);
  padding: 8px 10px;
  border-radius: 6px;
  z-index: 50;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

.autoplay-disabled {
  color: rgba(255,255,255,0.5);
  position: relative;
}
.autoplay-disabled::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(255,255,255,0.6);
  transform: translateY(-50%);
  pointer-events: none;
}
</style>
