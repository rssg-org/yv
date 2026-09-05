<template>
  <div class="app-shell" :class="{ 'is-dark': isDarkMode }">
    <!-- Locked dashboard / calculator authentication -->
    <section v-if="!playerUnlocked" class="dashboard-screen">
      <header class="dashboard-header">
        <div class="brand-block">
          <div class="brand-mark" aria-hidden="true">YV</div>
          <div>
            <p class="eyebrow">Usefull Tools</p>
            <h1>Welcome back</h1>
            <p class="dashboard-subtitle">Hint: Z+A</p>
          </div>
        </div>

        <button
          type="button"
          class="theme-"
          :aria-label="isDarkMode ? 'ライトモードに切り替える' : 'ダークモードに切り替える'"
          :title="isDarkMode ? 'ライトモード' : 'ダークモード'"
          @click="toggleTheme"
        >
          <span aria-hidden="true">
            <i
              v-if="isDarkMode"
              data-lucide="sun"
              aria-hidden="true"
            ></i>
            <i
              v-else
              data-lucide="moon"
              aria-hidden="true"
            ></i>
          </span>
          <span>{{ isDarkMode ? 'Light' : 'Dark' }}</span>
        </button>
      </header>

      <div class="dashboard-grid">
        <div class="dashboard-column">
          <article class="dashboard-card clock-card">
            <div class="card-topline">
              <p class="card-label">Clock</p>
              <i data-lucide="clock" aria-hidden="true"></i>
            </div>
            <p class="clock-time">{{ nowTime }}</p>
            <p class="clock-date">{{ nowDate }}</p>
          </article>

          <article class="dashboard-card calendar-card">
            <div class="card-topline">
              <p class="card-label">Calendar</p>
              <span class="card-icon" aria-hidden="true"><i data-lucide="calendar" aria-hidden="true"></i></span>
            </div>

            <div class="calendar-head">
              <button type="button" aria-label="前の月" @click="moveMonth(-1)">
                <i data-lucide="chevron-left" aria-hidden="true"></i>
              </button>
              
              <strong>{{ calendarTitle }}</strong>
              
              <button type="button" aria-label="次の月" @click="moveMonth(1)">
                <i data-lucide="chevron-right" aria-hidden="true"></i>
              </button>
            </div>

            <div class="calendar-weekdays">
              <span v-for="(day, idx) in weekdays" :key="`${day}-${idx}`">{{ day }}</span>
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

          <article class="dashboard-card compact-card">
            <div class="card-topline">
              <p class="card-label">Counter</p>
              <span class="card-icon" aria-hidden="true">
                <i data-lucide="hash"></i>
              </span>
            </div>
            <p class="counter-value">{{ counter }}</p>
            <div class="button-row">
              <button type="button" @click="counter -= 1">−</button>
              <button type="button" @click="counter += 1">+</button>
              <button type="button" @click="counter = 0">Reset</button>
            </div>
          </article>
        </div>

        <div class="dashboard-center">
          <article class="dashboard-card calculator-card">
            <div class="calculator-head">
              <div>
                <p class="card-label">Calculator</p>
                <h2>Access terminal</h2>
              </div>
              <div class="lock-badge" :class="{ error: unlockError }">
                <span aria-hidden="true">
                  <i
                    v-if="!unlockError"
                    data-lucide="zap"
                    aria-hidden="true"
                  ></i>
                  <span v-else>!</span>
                </span>
                {{ unlockError ? 'Invalid' : 'Locked' }}
              </div>
            </div>

            <div class="calc-display-wrap">
              <span class="display-prefix">ACCESS</span>
              <input
                class="calc-display"
                :value="calcDisplay"
                readonly
                aria-label="認証用電卓"
                autocomplete="off"
              />
            </div>

            <div class="calc-grid" aria-label="calculator keypad">
              <button
                v-for="key in calcKeys"
                :key="key"
                type="button"
                :class="{
                  operator: ['+', '-', '*', '/'].includes(key),
                  action: ['C', '⌫', '='].includes(key),
                  auth: key === 'A',
                }"
                @click="onCalcKey(key)"
              >
                <span v-if="key === '*'" aria-label="multiply">×</span>
                <span v-else-if="key === '/'" aria-label="divide">÷</span>
                <span v-else-if="key === '⌫'" aria-label="backspace"><i data-lucide="delete" aria-hidden="true"></i></span>
                <span v-else>{{ key }}</span>
              </button>
            </div>

            <div class="auth-status">
              <div class="auth-status-icon" :class="{ error: unlockError }">
                {{ unlockError ? '!' : 'A' }}
              </div>
              <div>
                <strong>{{ unlockError ? 'Sequence rejected' : 'Authentication required' }}</strong>
                <p>
                  {{ unlockError
                    ? 'Clear the display and enter the sequence again.'
                    : 'Enter the access sequence, then press A.' }}
                </p>
              </div>
            </div>

            <p class="unlock-error" :class="{ visible: unlockError }">
              ?
            </p>
          </article>
        </div>

        <div class="dashboard-column">
          <article class="dashboard-card compact-card">
            <div class="card-topline">
              <p class="card-label">Timer</p>
              <span class="card-icon" aria-hidden="true"><i data-lucide="timer" aria-hidden="true"></i></span>
            </div>
            <p class="time-value">{{ formatTime(timerRemaining) }}</p>
            <div class="button-row">
              <button type="button" @click="startTimer">Start</button>
              <button type="button" @click="pauseTimer">Pause</button>
              <button type="button" @click="resetTimer">Reset</button>
            </div>
          </article>

          <article class="dashboard-card compact-card">
            <div class="card-topline">
              <p class="card-label">Stopwatch</p>
              <span class="card-icon" aria-hidden="true"><i data-lucide="timer" aria-hidden="true"></i></span>
            </div>
            <p class="time-value">{{ formatTime(stopwatchSeconds) }}</p>
            <div class="button-row">
              <button type="button" @click="stopwatchRunning = true">Start</button>
              <button type="button" @click="stopwatchRunning = false">Pause</button>
              <button type="button" @click="resetStopwatch">Reset</button>
            </div>
          </article>

          <article class="dashboard-card compact-card">
            <div class="card-topline">
              <p class="card-label">Pomodoro</p>
              <span class="card-icon" aria-hidden="true"><i data-lucide="timer" aria-hidden="true"></i></span>
            </div>
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

    <!-- Existing YV application -->
    <section v-else class="player-shell">
      <HeaderSearch
        @search="onSearch"
        @toggle-dark-mode="toggleDarkMode"
        :sidebar-open="false"
        :show-sidebar-toggle="false"
      />

      <button type="button" class="back-to-calculator" @click="playerUnlocked = false">
        <span aria-hidden="true"><i data-lucide="undo-2" aria-hidden="true"></i></span>
        電卓に戻る
      </button>

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
            >
              <i data-lucide="x" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div v-if="connectionFailurePrompt" class="proxy-connection-prompt" role="alert">
          <div class="proxy-connection-message">
            <strong>API通信がブロックされている可能性が高いです</strong>
            <p>
              接続確認用のJSONを取得できませんでした。ネットワークでフィルタリングされている場合は、プロキシを設定してください。
            </p>
          </div>
          <div class="proxy-connection-actions">
            <button type="button" class="open-proxy-settings" @click="openProxySettings">
              プロキシ設定を開く
            </button>
            <button
              type="button"
              class="dismiss-proxy-prompt"
              aria-label="プロキシ設定の案内を閉じる"
              @click="connectionFailurePrompt = false"
            >
              <i data-lucide="x" aria-hidden="true"></i>
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
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { loadDisplayMode, computeIsDarkFromMode } from '@/utils/settingsManager';
import { API_CONNECTION_FAILURE_EVENT } from '@/services/siatubeApi';
import { checkForUpdate, fetchLatestBuildHtml, replaceDocumentWithHtml } from '@/utils/versionCheck';

// Lucide CDN
const loadLucide = () => {
  return new Promise((resolve) => {
    if (window.lucide) {
      resolve(window.lucide)
      return
    }

    const existing = document.querySelector(
      'script[data-lucide-cdn]'
    )

    if (existing) {
      existing.addEventListener('load', () => resolve(window.lucide), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
    script.async = true
    script.dataset.lucideCdn = 'true'

    script.addEventListener(
      'load',
      () => resolve(window.lucide),
      { once: true },
    )

    document.head.appendChild(script)
  })
}

const refreshLucideIcons = async () => {
  try {
    const lucide = await loadLucide();

    if (lucide?.createIcons) {
      await nextTick();
      lucide.createIcons();
    }
  } catch (error) {
    console.warn('[Lucide] Icon refresh failed:', error);
  }
};

const POMODORO_DEFAULT = 25 * 60;
const TIMER_DEFAULT = 5 * 60;
const AUTH_SEQUENCE = '7895123';

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
    const unlockError = ref(false);
    const isDarkMode = ref(false);

    const calcDisplay = ref('0');
    const calcKeys = [
      '7', '8', '9', '/',
      '4', '5', '6', '*',
      '1', '2', '3', '-',
      '0', '.', '=', '+',
      'C', '⌫', 'A',
    ];

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

    const calendarTitle = computed(
      () => `${viewYear.value} / ${String(viewMonth.value + 1).padStart(2, '0')}`
    );

    const todayDate = computed(() => now.value.getDate());

    const calendarIsCurrentMonth = computed(
      () =>
        viewYear.value === now.value.getFullYear() &&
        viewMonth.value === now.value.getMonth()
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

    /*
     * The keypad is primarily an authentication terminal.
     * The sequence is:
     * 7 → 8 → 9 → 5 → 1 → 2 → 3 → A
     *
     * Normal calculator operations are retained for the other keys,
     * so the dashboard still behaves like the original utility screen.
     */
    const onCalcKey = (key) => {
      unlockError.value = false;

      if (key === 'A') {
        if (calcDisplay.value === AUTH_SEQUENCE) {
          playerUnlocked.value = true;
          calcDisplay.value = '0';
          unlockError.value = false;
        } else {
          unlockError.value = true;
          calcDisplay.value = '0';
        }
      
        return;
      }

      if (key === 'C') {
        calcDisplay.value = '0';
        return;
      }

      if (key === '⌫') {
        calcDisplay.value =
          calcDisplay.value.length > 1
            ? calcDisplay.value.slice(0, -1)
            : '0';
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

      calcDisplay.value =
        calcDisplay.value === '0'
          ? key
          : `${calcDisplay.value}${key}`;
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

    const applyTheme = (dark) => {
      isDarkMode.value = Boolean(dark);

      if (isDarkMode.value) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    };

    const toggleDarkMode = (dark) => {
      applyTheme(dark);

      try {
        localStorage.setItem('darkMode', isDarkMode.value ? 'true' : 'false');
      } catch (e) {
        // noop
      }
    };

    const toggleTheme = () => {
      toggleDarkMode(!isDarkMode.value);
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

    let ticker = null;

    onMounted(async () => {
      window.addEventListener(
        API_CONNECTION_FAILURE_EVENT,
        handleApiConnectionFailure
      );

      checkForUpdate()
        .then((result) => {
          currentVersion.value = result.currentVersion;
          latestVersion.value = result.latestVersion;
          updateAvailable.value = result.updateAvailable;
        })
        .catch(() => {});

      try {
        const mode = loadDisplayMode();
        applyTheme(computeIsDarkFromMode(mode));
      } catch (e) {
        try {
          applyTheme(localStorage.getItem('darkMode') === 'true');
        } catch {
          applyTheme(false);
        }
      }

      ticker = window.setInterval(() => {
        now.value = new Date();

        if (timerRunning.value && timerRemaining.value > 0) {
          timerRemaining.value -= 1;
        }

        if (stopwatchRunning.value) {
          stopwatchSeconds.value += 1;
        }

        if (pomodoroRunning.value && pomodoroRemaining.value > 0) {
          pomodoroRemaining.value -= 1;
        }
      }, 1000);
    });

    onBeforeUnmount(() => {
      window.removeEventListener(
        API_CONNECTION_FAILURE_EVENT,
        handleApiConnectionFailure
      );

      if (ticker) window.clearInterval(ticker);

      try {
        document.body.classList.remove('settings-modal-open');
      } catch (e) {
        // noop
      }
    });

    watch(settingsModalOpen, (newVal) => {
      try {
        localStorage.setItem(
          'settingsModalOpen',
          newVal ? 'true' : 'false'
        );
      } catch (e) {
        // noop
      }

      try {
        document.body.classList.toggle(
          'settings-modal-open',
          newVal
        );
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
      unlockError,
      isDarkMode,
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
      toggleTheme,
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
