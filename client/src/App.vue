<template>
  <div class="app-shell">
    <section v-if="!playerUnlocked" class="dashboard-screen">
      <div class="dashboard-grid">
        <div class="dashboard-column">
          <article class="dashboard-card clock-card">
            <p class="card-label">Clock</p>
            <p class="clock-time">{{ nowTime }}</p>
            <p class="clock-date">{{ nowDate }}</p>
          </article>

          <article class="dashboard-card calendar-card">
            <p class="card-label">Calendar</p>
            <div class="calendar-head">
              <button type="button" @click="moveMonth(-1)">‹</button>
              <strong>{{ calendarTitle }}</strong>
              <button type="button" @click="moveMonth(1)">›</button>
            </div>
            <div class="calendar-weekdays">
              <span v-for="day in weekdays" :key="day">{{ day }}</span>
            </div>
            <div class="calendar-grid">
              <span
                v-for="(day, idx) in calendarDays"
                :key="`${day}-${idx}`"
                :class="{ empty: !day, today: day === todayDate && calendarIsCurrentMonth }"
              >
                {{ day || '' }}
              </span>
            </div>
          </article>

          <article class="dashboard-card">
            <p class="card-label">Counter</p>
            <p class="counter-value">{{ counter }}</p>
            <div class="button-row">
              <button type="button" @click="counter -= 1">-</button>
              <button type="button" @click="counter += 1">+</button>
              <button type="button" @click="counter = 0">Reset</button>
            </div>
          </article>
        </div>

        <div class="dashboard-center">
          <article class="dashboard-card calculator-card">
            <div class="calculator-head">
              <p class="card-label">Calculator</p>
              <span class="auth-hint">PASS: 4242</span>
            </div>
            <input class="calc-display" :value="calcDisplay" readonly aria-label="calculator" />
            <div class="calc-grid">
              <button
                v-for="key in calcKeys"
                :key="key"
                type="button"
                @click="onCalcKey(key)"
                :class="{ action: ['C', '⌫', '='].includes(key), operator: ['+', '-', '*', '/'].includes(key) }"
              >
                {{ key }}
              </button>
            </div>
            <div class="unlock-row">
              <input v-model="authCode" maxlength="4" placeholder="認証コード" />
              <button type="button" @click="unlockPlayer">ロック解除</button>
            </div>
            <p v-if="unlockError" class="unlock-error">認証コードが違います</p>
          </article>
        </div>

        <div class="dashboard-column">
          <article class="dashboard-card">
            <p class="card-label">Timer</p>
            <p class="time-value">{{ formatTime(timerRemaining) }}</p>
            <div class="button-row">
              <button type="button" @click="startTimer">Start</button>
              <button type="button" @click="pauseTimer">Pause</button>
              <button type="button" @click="resetTimer">Reset</button>
            </div>
          </article>

          <article class="dashboard-card">
            <p class="card-label">Stopwatch</p>
            <p class="time-value">{{ formatTime(stopwatchSeconds) }}</p>
            <div class="button-row">
              <button type="button" @click="stopwatchRunning = true">Start</button>
              <button type="button" @click="stopwatchRunning = false">Pause</button>
              <button type="button" @click="resetStopwatch">Reset</button>
            </div>
          </article>

          <article class="dashboard-card">
            <p class="card-label">Pomodoro</p>
            <p class="time-value">{{ formatTime(pomodoroRemaining) }}</p>
            <div class="button-row">
              <button type="button" @click="pomodoroRunning = true">Start</button>
              <button type="button" @click="pomodoroRunning = false">Pause</button>
              <button type="button" @click="resetPomodoro">Reset</button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-else class="player-shell">
      <HeaderSearch
        @search="onSearch"
        @toggle-dark-mode="toggleDarkMode"
        :sidebar-open="false"
        :show-sidebar-toggle="false"
      />
      <button type="button" class="back-to-calculator" @click="playerUnlocked = false">電卓に戻る</button>

      <main class="app-content unlocked-content">
        <div v-if="updateAvailable" class="version-warning" role="alert">
          <div>
            <strong>新しいバージョンがあります</strong>
            <p>現在: {{ currentVersion }} ／ 最新: {{ latestVersion }}</p>
            <p v-if="temporaryUpdateError" class="temporary-update-error">
              最新バージョンを読み込めませんでした。通信またはプロキシ設定を確認してください。
            </p>
          </div>
          <div class="version-warning-actions">
            <button
              type="button"
              class="use-latest-version"
              :disabled="temporaryUpdateLoading"
              @click="useLatestVersionTemporarily"
            >
              {{ temporaryUpdateLoading ? '読み込み中…' : '最新バージョンを一時的に使用' }}
            </button>
            <button
              type="button"
              class="dismiss-version-warning"
              aria-label="更新のお知らせを閉じる"
              @click="updateAvailable = false"
            >✕</button>
          </div>
        </div>

        <div v-if="connectionFailurePrompt" class="proxy-connection-prompt" role="alert">
          <div class="proxy-connection-message">
            <strong>API通信がブロックされている可能性が高いです</strong>
            <p>接続確認用のJSONを取得できませんでした。ネットワークでフィルタリングされている場合は、プロキシを設定してください。</p>
          </div>
          <div class="proxy-connection-actions">
            <button type="button" class="open-proxy-settings" @click="openProxySettings">プロキシ設定を開く</button>
            <button
              type="button"
              class="dismiss-proxy-prompt"
              aria-label="プロキシ設定の案内を閉じる"
              @click="connectionFailurePrompt = false"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="player-app-card">
          <router-view />
        </div>
      </main>

      <nav class="floating-nav" aria-label="primary">
        <router-link to="/">ホーム</router-link>
        <router-link to="/subscriptions">登録</router-link>
        <router-link to="/playlists">再生リスト</router-link>
        <router-link to="/history">履歴</router-link>
        <router-link to="/settings">設定</router-link>
      </nav>

      <SettingsView />
    </section>
  </div>
</template>

<script>
import HeaderSearch from '@/components/HeaderSearch.vue';
import SettingsView from '@/views/SettingsView.vue';
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { loadDisplayMode, computeIsDarkFromMode } from '@/utils/settingsManager';
import { API_CONNECTION_FAILURE_EVENT } from '@/services/siatubeApi';
import { checkForUpdate, fetchLatestBuildHtml, replaceDocumentWithHtml } from '@/utils/versionCheck';

const POMODORO_DEFAULT = 25 * 60;
const TIMER_DEFAULT = 5 * 60;

export default {
  name: 'App',
  components: {
    HeaderSearch,
    SettingsView,
  },
  setup() {
    const router = useRouter();
    const now = ref(new Date());
    const playerUnlocked = ref(false);
    const authCode = ref('');
    const unlockError = ref(false);

    const calcDisplay = ref('0');
    const calcKeys = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+', 'C', '⌫'];

    const counter = ref(0);

    const timerRemaining = ref(TIMER_DEFAULT);
    const timerRunning = ref(false);

    const stopwatchSeconds = ref(0);
    const stopwatchRunning = ref(false);

    const pomodoroRemaining = ref(POMODORO_DEFAULT);
    const pomodoroRunning = ref(false);

    const viewYear = ref(now.value.getFullYear());
    const viewMonth = ref(now.value.getMonth());

    const settingsModalOpen = ref(false);
    const connectionFailurePrompt = ref(false);
    const updateAvailable = ref(false);
    const currentVersion = ref('');
    const latestVersion = ref('');
    const temporaryUpdateLoading = ref(false);
    const temporaryUpdateError = ref(false);

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const nowTime = computed(() =>
      now.value.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );

    const nowDate = computed(() =>
      now.value.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })
    );

    const calendarTitle = computed(() => `${viewYear.value} / ${String(viewMonth.value + 1).padStart(2, '0')}`);
    const todayDate = computed(() => now.value.getDate());
    const calendarIsCurrentMonth = computed(
      () => viewYear.value === now.value.getFullYear() && viewMonth.value === now.value.getMonth()
    );
    const calendarDays = computed(() => {
      const first = new Date(viewYear.value, viewMonth.value, 1);
      const last = new Date(viewYear.value, viewMonth.value + 1, 0);
      const days = [];
      for (let i = 0; i < first.getDay(); i += 1) days.push(null);
      for (let day = 1; day <= last.getDate(); day += 1) days.push(day);
      return days;
    });

    const moveMonth = (delta) => {
      const next = new Date(viewYear.value, viewMonth.value + delta, 1);
      viewYear.value = next.getFullYear();
      viewMonth.value = next.getMonth();
    };

    const onCalcKey = (key) => {
      unlockError.value = false;
      if (key === 'C') {
        calcDisplay.value = '0';
        return;
      }
      if (key === '⌫') {
        calcDisplay.value = calcDisplay.value.length > 1 ? calcDisplay.value.slice(0, -1) : '0';
        return;
      }
      if (key === '=') {
        if (!/^[0-9+\-*/.()\s]+$/.test(calcDisplay.value)) return;
        try {
          const result = Function(`"use strict"; return (${calcDisplay.value})`)();
          calcDisplay.value = Number.isFinite(result) ? String(result) : '0';
        } catch {
          calcDisplay.value = '0';
        }
        return;
      }
      calcDisplay.value = calcDisplay.value === '0' ? key : `${calcDisplay.value}${key}`;
    };

    const formatTime = (value) => {
      const total = Math.max(0, Math.floor(value));
      const m = String(Math.floor(total / 60)).padStart(2, '0');
      const s = String(total % 60).padStart(2, '0');
      return `${m}:${s}`;
    };

    const startTimer = () => {
      if (timerRemaining.value <= 0) timerRemaining.value = TIMER_DEFAULT;
      timerRunning.value = true;
    };
    const pauseTimer = () => {
      timerRunning.value = false;
    };
    const resetTimer = () => {
      timerRunning.value = false;
      timerRemaining.value = TIMER_DEFAULT;
    };

    const resetStopwatch = () => {
      stopwatchRunning.value = false;
      stopwatchSeconds.value = 0;
    };

    const resetPomodoro = () => {
      pomodoroRunning.value = false;
      pomodoroRemaining.value = POMODORO_DEFAULT;
    };

    const unlockPlayer = () => {
      if (authCode.value === '4242') {
        playerUnlocked.value = true;
        unlockError.value = false;
        authCode.value = '';
      } else {
        unlockError.value = true;
      }
    };

    const openSettingsModal = () => {
      settingsModalOpen.value = true;
    };

    const closeSettingsModal = () => {
      settingsModalOpen.value = false;
    };

    const handleApiConnectionFailure = () => {
      connectionFailurePrompt.value = true;
    };

    const openProxySettings = () => {
      connectionFailurePrompt.value = false;
      openSettingsModal();
    };

    const useLatestVersionTemporarily = async () => {
      if (temporaryUpdateLoading.value) return;
      temporaryUpdateLoading.value = true;
      temporaryUpdateError.value = false;
      try {
        const html = await fetchLatestBuildHtml();
        replaceDocumentWithHtml(html);
      } catch (error) {
        console.error('[App.vue] Failed to load latest temporary build', error);
        temporaryUpdateError.value = true;
        temporaryUpdateLoading.value = false;
      }
    };

    const onSearch = (keyword) => {
      if (!keyword || !keyword.trim()) return;
      router.push({ path: '/search', query: { q: keyword.trim() } });
    };

    const toggleDarkMode = (isDarkMode) => {
      if (isDarkMode) document.documentElement.classList.add('dark-mode');
      else document.documentElement.classList.remove('dark-mode');
      try {
        localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
      } catch (e) {
        // noop
      }
    };

    let ticker = null;

    onMounted(() => {
      window.addEventListener(API_CONNECTION_FAILURE_EVENT, handleApiConnectionFailure);
      checkForUpdate()
        .then((result) => {
          currentVersion.value = result.currentVersion;
          latestVersion.value = result.latestVersion;
          updateAvailable.value = result.updateAvailable;
        })
        .catch(() => {});

      try {
        const mode = loadDisplayMode();
        const isDarkMode = computeIsDarkFromMode(mode);
        if (isDarkMode) document.documentElement.classList.add('dark-mode');
        else document.documentElement.classList.remove('dark-mode');
      } catch (e) {
        // noop
      }

      ticker = window.setInterval(() => {
        now.value = new Date();
        if (timerRunning.value && timerRemaining.value > 0) timerRemaining.value -= 1;
        if (stopwatchRunning.value) stopwatchSeconds.value += 1;
        if (pomodoroRunning.value && pomodoroRemaining.value > 0) pomodoroRemaining.value -= 1;
      }, 1000);
    });

    onBeforeUnmount(() => {
      window.removeEventListener(API_CONNECTION_FAILURE_EVENT, handleApiConnectionFailure);
      if (ticker) window.clearInterval(ticker);
      try {
        document.body.classList.remove('settings-modal-open');
      } catch (e) {
        // noop
      }
    });

    watch(settingsModalOpen, (newVal) => {
      try {
        localStorage.setItem('settingsModalOpen', newVal ? 'true' : 'false');
      } catch (e) {
        // noop
      }
      try {
        document.body.classList.toggle('settings-modal-open', newVal);
      } catch (e) {
        // noop
      }
    });

    provide('settingsModal', {
      isOpen: settingsModalOpen,
      openSettingsModal,
      closeSettingsModal,
    });

    return {
      playerUnlocked,
      authCode,
      unlockError,
      weekdays,
      nowTime,
      nowDate,
      calendarTitle,
      calendarDays,
      moveMonth,
      todayDate,
      calendarIsCurrentMonth,
      counter,
      calcDisplay,
      calcKeys,
      onCalcKey,
      unlockPlayer,
      timerRemaining,
      stopwatchSeconds,
      pomodoroRemaining,
      formatTime,
      startTimer,
      pauseTimer,
      resetTimer,
      stopwatchRunning,
      resetStopwatch,
      pomodoroRunning,
      resetPomodoro,
      onSearch,
      toggleDarkMode,
      connectionFailurePrompt,
      openProxySettings,
      updateAvailable,
      currentVersion,
      latestVersion,
      temporaryUpdateLoading,
      temporaryUpdateError,
      useLatestVersionTemporarily,
    };
  },
};
</script>

<style>
.app-shell {
  min-height: 100vh;
  background: radial-gradient(circle at 10% 10%, #1d2430, #0b0f16 55%);
  color: #f1f5f9;
}

.dashboard-screen {
  padding: 28px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(320px, 1.4fr) minmax(220px, 1fr);
  gap: 20px;
  max-width: 1320px;
  margin: 0 auto;
}

.dashboard-column,
.dashboard-center {
  display: grid;
  gap: 20px;
  align-content: start;
}

.dashboard-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  padding: 20px;
  background: rgba(15, 20, 31, 0.9);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
}

.card-label {
  margin: 0 0 10px;
  color: #93a5c2;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.clock-time,
.counter-value,
.time-value {
  margin: 0;
  font-size: clamp(1.7rem, 3.6vw, 2.5rem);
  font-weight: 700;
}

.clock-date {
  margin-top: 10px;
  color: #bdc9dd;
}

.calculator-card {
  min-height: 520px;
}

.calculator-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.auth-hint {
  color: #94a3b8;
  font-size: 0.8rem;
}

.calc-display {
  width: 100%;
  margin: 6px 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: rgba(2, 6, 23, 0.8);
  color: #e2e8f0;
  font-size: 2rem;
  text-align: right;
  padding: 14px;
  box-sizing: border-box;
}

.calc-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.calc-grid button,
.button-row button,
.unlock-row button,
.calendar-head button {
  border: none;
  border-radius: 12px;
  padding: 12px;
  background: #1f2937;
  color: #e2e8f0;
  cursor: pointer;
}

.calc-grid button.operator {
  background: #0f766e;
}

.calc-grid button.action {
  background: #8b5cf6;
}

.button-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.unlock-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  margin-top: 16px;
}

.unlock-row input {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.85);
  color: #e2e8f0;
  padding: 10px;
}

.unlock-error {
  margin: 10px 0 0;
  color: #fda4af;
}

.calendar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.calendar-head strong {
  font-size: 0.95rem;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-top: 12px;
}

.calendar-weekdays span,
.calendar-grid span {
  border-radius: 10px;
  text-align: center;
  padding: 5px 0;
  font-size: 0.8rem;
}

.calendar-weekdays span {
  color: #94a3b8;
}

.calendar-grid span {
  background: rgba(30, 41, 59, 0.65);
}

.calendar-grid span.empty {
  opacity: 0;
}

.calendar-grid span.today {
  background: #ef4444;
  color: #fff;
}

.player-shell {
  min-height: 100vh;
}

.back-to-calculator {
  position: fixed;
  top: 10px;
  right: 16px;
  z-index: 1200;
  border: 0;
  border-radius: 14px;
  padding: 10px 14px;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.92);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  cursor: pointer;
}

.unlocked-content {
  margin-left: 0;
  padding: 72px 16px 94px;
}

.player-app-card {
  max-width: 1280px;
  margin: 0 auto;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.78);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.42);
  overflow: hidden;
}

.floating-nav {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 1200;
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(2, 6, 23, 0.88);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5);
}

.floating-nav a {
  border-radius: 999px;
  padding: 8px 12px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.86rem;
}

.floating-nav a.router-link-active {
  background: #2563eb;
  color: #fff;
}

.version-warning,
.proxy-connection-prompt {
  max-width: 1280px;
  margin: 0 auto 14px;
}

.version-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid #facc15;
  border-radius: 14px;
  color: #fef08a;
  background: rgba(113, 63, 18, 0.9);
}

.version-warning p {
  margin: 4px 0 0;
  font-size: 0.9rem;
}

.dismiss-version-warning {
  border: 0;
  padding: 6px 9px;
  color: inherit;
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.version-warning-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.use-latest-version {
  border: 1px solid currentColor;
  border-radius: 6px;
  padding: 8px 12px;
  color: inherit;
  background: rgba(255, 255, 255, 0.15);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.use-latest-version:disabled {
  cursor: wait;
  opacity: 0.65;
}

.temporary-update-error {
  color: #fca5a5;
  font-weight: 600;
}

.proxy-connection-prompt {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 2px solid #fb923c;
  border-left-width: 7px;
  border-radius: 14px;
  color: #f8fafc;
  background: rgba(67, 27, 11, 0.88);
  box-shadow: 0 4px 18px rgba(251, 146, 60, 0.18);
}

.proxy-connection-message strong {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #fdba74;
  font-size: clamp(1.15rem, 2vw, 1.45rem);
  line-height: 1.35;
}

.proxy-connection-message strong::before {
  content: '⚠️';
  font-size: 1.35em;
}

.proxy-connection-prompt p {
  margin: 8px 0 0;
  font-size: 0.96rem;
  line-height: 1.55;
}

.proxy-connection-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.open-proxy-settings,
.dismiss-proxy-prompt {
  border: none;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}

.open-proxy-settings {
  padding: 11px 16px;
  color: #fff;
  background: #2563eb;
  font-weight: 600;
}

.dismiss-proxy-prompt {
  padding: 7px 9px;
  color: #e2e8f0;
  background: transparent;
}

@media (max-width: 980px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .calculator-card {
    min-height: auto;
  }
}

@media (max-width: 700px) {
  .unlocked-content {
    padding-inline: 10px;
  }

  .floating-nav {
    width: calc(100% - 20px);
    justify-content: space-between;
    overflow-x: auto;
  }

  .back-to-calculator {
    right: 10px;
    top: 8px;
    padding: 8px 11px;
    font-size: 0.82rem;
  }

  .version-warning,
  .proxy-connection-prompt {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
