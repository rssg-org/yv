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
          :aria-label="
            isDarkMode
              ? 'ライトモードに切り替える'
              : 'ダークモードに切り替える'
          "
          :title="isDarkMode ? 'ライトモード' : 'ダークモード'"
          @click="toggleTheme"
        >
          <span class="icon-wrap" aria-hidden="true">
            <Icon :name="isDarkMode ? 'sun' : 'moon'" />
          </span>

          <span>{{ isDarkMode ? 'Light' : 'Dark' }}</span>
        </button>
      </header>

      <div class="dashboard-grid">
        <!-- LEFT -->
        <div class="dashboard-column">
          <!-- Clock -->
          <article class="dashboard-card clock-card">
            <div class="card-topline">
              <p class="card-label">Clock</p>
              <Icon name="clock" />
            </div>

            <p class="clock-time">{{ nowTime }}</p>
            <p class="clock-date">{{ nowDate }}</p>
          </article>

          <!-- Calendar -->
          <article class="dashboard-card calendar-card">
            <div class="card-topline">
              <p class="card-label">Calendar</p>

              <span class="card-icon" aria-hidden="true">
                <Icon name="calendar" />
              </span>
            </div>

            <div class="calendar-head">
              <button
                type="button"
                aria-label="前の月"
                @click="moveMonth(-1)"
              >
                <Icon name="chevron-left" />
              </button>

              <strong>{{ calendarTitle }}</strong>

              <button
                type="button"
                aria-label="次の月"
                @click="moveMonth(1)"
              >
                <Icon name="chevron-right" />
              </button>
            </div>

            <div class="calendar-weekdays">
              <span
                v-for="(day, idx) in weekdays"
                :key="`${day}-${idx}`"
              >
                {{ day }}
              </span>
            </div>

            <div class="calendar-grid">
              <span
                v-for="(day, idx) in calendarDays"
                :key="`${day}-${idx}`"
                :class="{
                  empty: !day,
                  today:
                    day === todayDate &&
                    calendarIsCurrentMonth,
                }"
              >
                {{ day || '' }}
              </span>
            </div>
          </article>

          <!-- Counter -->
          <article class="dashboard-card compact-card">
            <div class="card-topline">
              <p class="card-label">Counter</p>

              <span class="card-icon" aria-hidden="true">
                <Icon name="hash" />
              </span>
            </div>

            <p class="counter-value">{{ counter }}</p>

            <div class="button-row">
              <button type="button" @click="counter -= 1">
                −
              </button>

              <button type="button" @click="counter += 1">
                +
              </button>

              <button type="button" @click="counter = 0">
                Reset
              </button>
            </div>
          </article>
        </div>

        <!-- CENTER -->
        <div class="dashboard-center">
          <article class="dashboard-card calculator-card">
            <div class="calculator-head">
              <div>
                <p class="card-label">Calculator</p>
                <h2>Simple Calculator</h2>
              </div>

              <div
                class="lock-badge"
                :class="{ error: unlockError }"
              >
                <span
                  class="lock-badge-icon"
                  aria-hidden="true"
                >
                  <Icon
                    v-if="!unlockError"
                    name="zap"
                  />

                  <span v-else>!</span>
                </span>

                {{ unlockError ? 'Invalid' : 'Locked' }}
              </div>
            </div>

            <div class="calc-display-wrap">
              <span class="display-prefix">DISPLAY</span>

              <input
                class="calc-display"
                :value="calcDisplay"
                readonly
                aria-label="認証用電卓"
                autocomplete="off"
              />
            </div>

            <div
              class="calc-grid"
              aria-label="calculator keypad"
            >
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
                <span
                  v-if="key === '*'"
                  aria-label="multiply"
                >
                  ×
                </span>

                <span
                  v-else-if="key === '/'"
                  aria-label="divide"
                >
                  ÷
                </span>

                <span
                  v-else-if="key === '⌫'"
                  aria-label="backspace"
                  class="key-icon"
                >
                  <Icon name="delete" />
                </span>

                <span v-else>
                  {{ key }}
                </span>
              </button>
            </div>

            <div class="auth-status">
              <div
                class="auth-status-icon"
                :class="{ error: unlockError }"
              >
                {{ unlockError ? '!' : 'A' }}
              </div>

              <div>
                <strong>
                  {{
                    unlockError
                      ? 'Sequence rejected'
                      : 'Authentication required'
                  }}
                </strong>

                <p>
                  {{
                    unlockError
                      ? 'Clear the display and enter the sequence again.'
                      : 'Enter the access sequence, then press A.'
                  }}
                </p>
              </div>
            </div>

            <p
              class="unlock-error"
              :class="{ visible: unlockError }"
            >
              ?
            </p>
          </article>
        </div>

        <!-- RIGHT -->
        <div class="dashboard-column">
          <!-- Timer -->
          <article class="dashboard-card compact-card">
            <div class="card-topline">
              <p class="card-label">Timer</p>

              <span class="card-icon" aria-hidden="true">
                <Icon name="timer" />
              </span>
            </div>

            <p class="time-value">
              {{ formatTime(timerRemaining) }}
            </p>

            <div class="button-row">
              <button type="button" @click="startTimer">
                Start
              </button>

              <button type="button" @click="pauseTimer">
                Pause
              </button>

              <button type="button" @click="resetTimer">
                Reset
              </button>
            </div>
          </article>

          <!-- Stopwatch -->
          <article class="dashboard-card compact-card">
            <div class="card-topline">
              <p class="card-label">Stopwatch</p>

              <span class="card-icon" aria-hidden="true">
                <Icon name="timer" />
              </span>
            </div>

            <p class="time-value">
              {{ formatTime(stopwatchSeconds) }}
            </p>

            <div class="button-row">
              <button
                type="button"
                @click="stopwatchRunning = true"
              >
                Start
              </button>

              <button
                type="button"
                @click="stopwatchRunning = false"
              >
                Pause
              </button>

              <button
                type="button"
                @click="resetStopwatch"
              >
                Reset
              </button>
            </div>
          </article>

          <!-- Pomodoro -->
          <article class="dashboard-card compact-card">
            <div class="card-topline">
              <p class="card-label">Pomodoro</p>

              <span class="card-icon" aria-hidden="true">
                <Icon name="timer" />
              </span>
            </div>

            <p class="time-value">
              {{ formatTime(pomodoroRemaining) }}
            </p>

            <div class="button-row">
              <button
                type="button"
                @click="pomodoroRunning = true"
              >
                Start
              </button>

              <button
                type="button"
                @click="pomodoroRunning = false"
              >
                Pause
              </button>

              <button
                type="button"
                @click="resetPomodoro"
              >
                Reset
              </button>
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

      <button
        type="button"
        class="back-to-calculator"
        @click="playerUnlocked = false"
      >
        <span aria-hidden="true">
          <Icon name="undo-2" />
        </span>

        電卓に戻る
      </button>

      <main class="app-content unlocked-content">
        <!-- Update notification -->
        <div
          v-if="updateAvailable"
          class="version-warning"
          role="alert"
        >
          <div>
            <strong>新しいバージョンがあります</strong>

            <p>
              現在: {{ currentVersion }}
              ／ 最新: {{ latestVersion }}
            </p>

            <p
              v-if="temporaryUpdateError"
              class="temporary-update-error"
            >
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
              {{
                temporaryUpdateLoading
                  ? '読み込み中…'
                  : '最新バージョンを一時的に使用'
              }}
            </button>

            <button
              type="button"
              class="dismiss-version-warning"
              aria-label="更新のお知らせを閉じる"
              @click="updateAvailable = false"
            >
              <Icon name="x" />
            </button>
          </div>
        </div>

        <!-- Proxy warning -->
        <div
          v-if="connectionFailurePrompt"
          class="proxy-connection-prompt"
          role="alert"
        >
          <div class="proxy-connection-message">
            <strong>
              API通信がブロックされている可能性が高いです
            </strong>

            <p>
              接続確認用のJSONを取得できませんでした。ネットワークでフィルタリングされている場合は、プロキシを設定してください。
            </p>
          </div>

          <div class="proxy-connection-actions">
            <button
              type="button"
              class="open-proxy-settings"
              @click="openProxySettings"
            >
              プロキシ設定を開く
            </button>

            <button
              type="button"
              class="dismiss-proxy-prompt"
              aria-label="プロキシ設定の案内を閉じる"
              @click="connectionFailurePrompt = false"
            >
              <Icon name="x" />
            </button>
          </div>
        </div>

        <div class="player-app-card">
          <router-view />
        </div>
      </main>

      <nav
        class="floating-nav"
        aria-label="primary"
      >
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

import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  h,
} from 'vue';

import { useRouter } from 'vue-router';

import {
  loadDisplayMode,
  computeIsDarkFromMode,
} from '@/utils/settingsManager';

import {
  API_CONNECTION_FAILURE_EVENT,
} from '@/services/siatubeApi';

import {
  checkForUpdate,
  fetchLatestBuildHtml,
  replaceDocumentWithHtml,
} from '@/utils/versionCheck';

/*
 * ============================================================
 * Vue-native icon component
 * ============================================================
 *
 * Lucide CDN / data-lucide / createIcons は使用しません。
 *
 * SVGをVueコンポーネントとして直接描画することで、
 * VueがDOMを完全に管理します。
 *
 * テーマ変更時に外部ライブラリがDOMを書き換えることが
 * ないため、リアクティブ状態との衝突を防げます。
 */

const ICON_PATHS = {
  sun: [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '4',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 2v2',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M12 20v2',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'm4.93 4.93 1.41 1.41',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'm17.66 17.66 1.41 1.41',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M2 12h2',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M20 12h2',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'm6.34 17.66-1.41 1.41',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'm19.07 4.93-1.41 1.41',
      },
    },
  ],

  moon: [
    {
      tag: 'path',
      attrs: {
        d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
      },
    },
  ],

  clock: [
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '12',
        r: '10',
      },
    },
    {
      tag: 'polyline',
      attrs: {
        points: '12 6 12 12 16 14',
      },
    },
  ],

  calendar: [
    {
      tag: 'rect',
      attrs: {
        x: '3',
        y: '4',
        width: '18',
        height: '18',
        rx: '2',
        ry: '2',
      },
    },
    {
      tag: 'line',
      attrs: {
        x1: '16',
        y1: '2',
        x2: '16',
        y2: '6',
      },
    },
    {
      tag: 'line',
      attrs: {
        x1: '8',
        y1: '2',
        x2: '8',
        y2: '6',
      },
    },
    {
      tag: 'line',
      attrs: {
        x1: '3',
        y1: '10',
        x2: '21',
        y2: '10',
      },
    },
  ],

  'chevron-left': [
    {
      tag: 'polyline',
      attrs: {
        points: '15 18 9 12 15 6',
      },
    },
  ],

  'chevron-right': [
    {
      tag: 'polyline',
      attrs: {
        points: '9 18 15 12 9 6',
      },
    },
  ],

  hash: [
    {
      tag: 'line',
      attrs: {
        x1: '4',
        y1: '9',
        x2: '20',
        y2: '9',
      },
    },
    {
      tag: 'line',
      attrs: {
        x1: '4',
        y1: '15',
        x2: '20',
        y2: '15',
      },
    },
    {
      tag: 'line',
      attrs: {
        x1: '10',
        y1: '3',
        x2: '8',
        y2: '21',
      },
    },
    {
      tag: 'line',
      attrs: {
        x1: '16',
        y1: '3',
        x2: '14',
        y2: '21',
      },
    },
  ],

  zap: [
    {
      tag: 'polygon',
      attrs: {
        points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2',
      },
    },
  ],

  delete: [
    {
      tag: 'path',
      attrs: {
        d: 'M3 6h18',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M8 6V4h8v2',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M19 6l-1 14H6L5 6',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M10 11v5',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M14 11v5',
      },
    },
  ],

  timer: [
    {
      tag: 'line',
      attrs: {
        x1: '10',
        y1: '2',
        x2: '14',
        y2: '2',
      },
    },
    {
      tag: 'line',
      attrs: {
        x1: '12',
        y1: '14',
        x2: '12',
        y2: '10',
      },
    },
    {
      tag: 'circle',
      attrs: {
        cx: '12',
        cy: '14',
        r: '8',
      },
    },
  ],

  'undo-2': [
    {
      tag: 'path',
      attrs: {
        d: 'M9 14 4 9l5-5',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M4 9h10a6 6 0 0 1 6 6v1',
      },
    },
  ],

  x: [
    {
      tag: 'line',
      attrs: {
        x1: '18',
        y1: '6',
        x2: '6',
        y2: '18',
      },
    },
    {
      tag: 'line',
      attrs: {
        x1: '6',
        y1: '6',
        x2: '18',
        y2: '18',
      },
    },
  ],
};

const Icon = {
  name: 'Icon',

  props: {
    name: {
      type: String,
      required: true,
    },

    size: {
      type: [Number, String],
      default: 20,
    },

    strokeWidth: {
      type: [Number, String],
      default: 2,
    },
  },

  setup(props) {
    return () => {
      const icon = ICON_PATHS[props.name];

      if (!icon) {
        return null;
      }

      return h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          width: props.size,
          height: props.size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': props.strokeWidth,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          class: 'app-icon',
        },
        icon.map((item, index) =>
          h(
            item.tag,
            {
              ...item.attrs,
              key: `${props.name}-${index}`,
            },
          )
        ),
      );
    };
  },
};

const POMODORO_DEFAULT = 25 * 60;
const TIMER_DEFAULT = 5 * 60;
const AUTH_SEQUENCE = '7895123';

export default {
  name: 'App',

  components: {
    HeaderSearch,
    SettingsView,
    Icon,
  },

  setup() {
    const router = useRouter();

    /*
     * ==========================================================
     * Dashboard state
     * ==========================================================
     */

    const now = ref(new Date());

    const playerUnlocked = ref(false);

    const unlockError = ref(false);

    const isDarkMode = ref(false);

    const calcDisplay = ref('0');

    const calcKeys = [
      '7',
      '8',
      '9',
      '/',
      '4',
      '5',
      '6',
      '*',
      '1',
      '2',
      '3',
      '-',
      '0',
      '.',
      '=',
      '+',
      'C',
      '⌫',
      'A',
    ];

    const counter = ref(0);

    const timerRemaining = ref(TIMER_DEFAULT);
    const timerRunning = ref(false);

    const stopwatchSeconds = ref(0);
    const stopwatchRunning = ref(false);

    const pomodoroRemaining = ref(POMODORO_DEFAULT);
    const pomodoroRunning = ref(false);

    /*
     * Calendar
     */

    const viewYear = ref(now.value.getFullYear());
    const viewMonth = ref(now.value.getMonth());

    /*
     * Settings / network / update
     */

    const settingsModalOpen = ref(false);

    const connectionFailurePrompt = ref(false);

    const updateAvailable = ref(false);

    const currentVersion = ref('');

    const latestVersion = ref('');

    const temporaryUpdateLoading = ref(false);

    const temporaryUpdateError = ref(false);

    const weekdays = [
      'S',
      'M',
      'T',
      'W',
      'T',
      'F',
      'S',
    ];

    /*
     * ==========================================================
     * Clock
     * ==========================================================
     */

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

    /*
     * ==========================================================
     * Calendar
     * ==========================================================
     */

    const calendarTitle = computed(
      () =>
        `${viewYear.value} / ${String(
          viewMonth.value + 1
        ).padStart(2, '0')}`
    );

    const todayDate = computed(
      () => now.value.getDate()
    );

    const calendarIsCurrentMonth = computed(
      () =>
        viewYear.value === now.value.getFullYear() &&
        viewMonth.value === now.value.getMonth()
    );

    const calendarDays = computed(() => {
      const first = new Date(
        viewYear.value,
        viewMonth.value,
        1
      );

      const last = new Date(
        viewYear.value,
        viewMonth.value + 1,
        0
      );

      const days = [];

      for (
        let i = 0;
        i < first.getDay();
        i += 1
      ) {
        days.push(null);
      }

      for (
        let day = 1;
        day <= last.getDate();
        day += 1
      ) {
        days.push(day);
      }

      return days;
    });

    const moveMonth = (delta) => {
      const next = new Date(
        viewYear.value,
        viewMonth.value + delta,
        1
      );

      viewYear.value = next.getFullYear();
      viewMonth.value = next.getMonth();
    };

    /*
     * ==========================================================
     * Calculator / authentication
     * ==========================================================
     *
     * 7 → 8 → 9 → 5 → 1 → 2 → 3 → A
     */

    const onCalcKey = (key) => {
      unlockError.value = false;

      /*
       * Authentication
       *
       * IMPORTANT:
       * No async operation.
       * No DOM manipulation.
       * No icon refresh.
       */
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

      /*
       * Clear
       */
      if (key === 'C') {
        calcDisplay.value = '0';
        return;
      }

      /*
       * Backspace
       */
      if (key === '⌫') {
        calcDisplay.value =
          calcDisplay.value.length > 1
            ? calcDisplay.value.slice(0, -1)
            : '0';

        return;
      }

      /*
       * Calculate
       */
      if (key === '=') {
        if (
          !/^[0-9+\-*/.()\s]+$/.test(
            calcDisplay.value
          )
        ) {
          return;
        }

        try {
          const result = Function(
            `"use strict"; return (${calcDisplay.value})`
          )();

          calcDisplay.value =
            Number.isFinite(result)
              ? String(result)
              : '0';
        } catch {
          calcDisplay.value = '0';
        }

        return;
      }

      /*
       * Normal key
       */
      calcDisplay.value =
        calcDisplay.value === '0'
          ? key
          : `${calcDisplay.value}${key}`;
    };

    /*
     * ==========================================================
     * Timers
     * ==========================================================
     */

    const formatTime = (value) => {
      const total = Math.max(
        0,
        Math.floor(value)
      );

      const m = String(
        Math.floor(total / 60)
      ).padStart(2, '0');

      const s = String(
        total % 60
      ).padStart(2, '0');

      return `${m}:${s}`;
    };

    const startTimer = () => {
      if (timerRemaining.value <= 0) {
        timerRemaining.value =
          TIMER_DEFAULT;
      }

      timerRunning.value = true;
    };

    const pauseTimer = () => {
      timerRunning.value = false;
    };

    const resetTimer = () => {
      timerRunning.value = false;
      timerRemaining.value =
        TIMER_DEFAULT;
    };

    const resetStopwatch = () => {
      stopwatchRunning.value = false;
      stopwatchSeconds.value = 0;
    };

    const resetPomodoro = () => {
      pomodoroRunning.value = false;
      pomodoroRemaining.value =
        POMODORO_DEFAULT;
    };

    /*
     * ==========================================================
     * Theme
     * ==========================================================
     *
     * Theme変更では、
     *
     * 1. Vueのstateを変更
     * 2. html.classを変更
     * 3. localStorageへ保存
     *
     * だけを行います。
     *
     * Lucideなどの外部DOM操作は一切ありません。
     */

    const applyTheme = (dark) => {
      isDarkMode.value = Boolean(dark);

      try {
        document.documentElement.classList.toggle(
          'dark-mode',
          isDarkMode.value
        );
      } catch (error) {
        console.warn(
          '[Theme] Failed to apply theme:',
          error
        );
      }
    };

    const toggleDarkMode = (dark) => {
      applyTheme(dark);

      try {
        localStorage.setItem(
          'darkMode',
          isDarkMode.value
            ? 'true'
            : 'false'
        );
      } catch (error) {
        // localStorage unavailable
      }
    };

    const toggleTheme = () => {
      /*
       * 意図的にasyncにしない。
       *
       * テーマ変更処理の後に何かを待つ処理を
       * 入れないことで、UIイベントをブロックしません。
       */
      toggleDarkMode(
        !isDarkMode.value
      );
    };

    /*
     * ==========================================================
     * Settings modal
     * ==========================================================
     */

    const openSettingsModal = () => {
      settingsModalOpen.value = true;
    };

    const closeSettingsModal = () => {
      settingsModalOpen.value = false;
    };

    /*
     * ==========================================================
     * API connection failure
     * ==========================================================
     */

    const handleApiConnectionFailure = () => {
      connectionFailurePrompt.value = true;
    };

    const openProxySettings = () => {
      connectionFailurePrompt.value = false;
      openSettingsModal();
    };

    /*
     * ==========================================================
     * Version update
     * ==========================================================
     */

    const useLatestVersionTemporarily =
      async () => {
        if (
          temporaryUpdateLoading.value
        ) {
          return;
        }

        temporaryUpdateLoading.value = true;
        temporaryUpdateError.value = false;

        try {
          const html =
            await fetchLatestBuildHtml();

          replaceDocumentWithHtml(html);
        } catch (error) {
          console.error(
            '[App.vue] Failed to load latest temporary build',
            error
          );

          temporaryUpdateError.value = true;
          temporaryUpdateLoading.value = false;
        }
      };

    /*
     * ==========================================================
     * Search
     * ==========================================================
     */

    const onSearch = (keyword) => {
      if (
        !keyword ||
        !keyword.trim()
      ) {
        return;
      }

      router.push({
        path: '/search',
        query: {
          q: keyword.trim(),
        },
      });
    };

    /*
     * ==========================================================
     * Lifecycle
     * ==========================================================
     */

    let ticker = null;

    onMounted(() => {
      /*
       * API failure event
       */
      window.addEventListener(
        API_CONNECTION_FAILURE_EVENT,
        handleApiConnectionFailure
      );

      /*
       * Version check
       *
       * 完全に非同期で、UI操作をブロックしません。
       */
      checkForUpdate()
        .then((result) => {
          currentVersion.value =
            result.currentVersion;

          latestVersion.value =
            result.latestVersion;

          updateAvailable.value =
            result.updateAvailable;
        })
        .catch(() => {});

      /*
       * Initial theme
       */
      try {
        const mode =
          loadDisplayMode();

        applyTheme(
          computeIsDarkFromMode(mode)
        );
      } catch (error) {
        try {
          applyTheme(
            localStorage.getItem(
              'darkMode'
            ) === 'true'
          );
        } catch {
          applyTheme(false);
        }
      }

      /*
       * Dashboard ticker
       *
       * テーマ変更とは完全に独立しています。
       */
      ticker = window.setInterval(
        () => {
          now.value = new Date();

          if (
            timerRunning.value &&
            timerRemaining.value > 0
          ) {
            timerRemaining.value -= 1;
          }

          if (
            stopwatchRunning.value
          ) {
            stopwatchSeconds.value += 1;
          }

          if (
            pomodoroRunning.value &&
            pomodoroRemaining.value > 0
          ) {
            pomodoroRemaining.value -= 1;
          }
        },
        1000
      );
    });

    onBeforeUnmount(() => {
      window.removeEventListener(
        API_CONNECTION_FAILURE_EVENT,
        handleApiConnectionFailure
      );

      if (ticker) {
        window.clearInterval(ticker);
        ticker = null;
      }

      try {
        document.body.classList.remove(
          'settings-modal-open'
        );
      } catch (error) {
        // noop
      }
    });

    /*
     * ==========================================================
     * Settings watcher
     * ==========================================================
     */

    watch(
      settingsModalOpen,
      (newVal) => {
        try {
          localStorage.setItem(
            'settingsModalOpen',
            newVal
              ? 'true'
              : 'false'
          );
        } catch (error) {
          // localStorage unavailable
        }

        try {
          document.body.classList.toggle(
            'settings-modal-open',
            newVal
          );
        } catch (error) {
          // noop
        }
      }
    );

    /*
     * ==========================================================
     * Provide settings modal
     * ==========================================================
     */

    provide('settingsModal', {
      isOpen: settingsModalOpen,
      openSettingsModal,
      closeSettingsModal,
    });

    /*
     * ==========================================================
     * Return
     * ==========================================================
     */

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

      Icon,
    };
  },
};
</script>
