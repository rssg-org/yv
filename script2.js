/* ================================================================
   script2.js
   動画プレイヤーアプリのメインロジックを担当
   配置先: https://api.vis0.top/ydl/script2.js
   image.php 配置先: https://api.vis0.top/ydl/image.php
   ================================================================ */
(() => {
  'use strict';

  const API_BASE = 'https://api.vis0.top/ydl/index.php';
  const ZO_API_BASE = 'https://yapi-vis0.zocomputer.io';
  const PROXY = 'https://api.vis0.top/ydl/image.php';
  const PAGE_LIMIT = 20;

  let currentVideoId = '';
  let currentVideoTitle = '';
  let currentFilter = 'all';
  let currentSort = 'relevance';
  let isLoading = false;
  let searchOffset = 0;
  let channelOffset = 0;
  let currentChannelUrl = '';
  let currentChannelName = '';
  let initialized = false;

  function getPlaybackMode() {
    return localStorage.getItem('playbackMode') === 'mp4' ? 'mp4' : 'hls';
  }

  window.setPlaybackMode = function setPlaybackMode(value) {
    const mode = value === 'mp4' ? 'mp4' : 'hls';
    localStorage.setItem('playbackMode', mode);
    const select = document.getElementById('playbackMode');
    if (select) select.value = mode;
  };

  window.initializePlayerApp = function initializePlayerApp() {
    if (initialized) return;
    if (!document.getElementById('app-container')) return;
    initialized = true;

    window.setPlaybackMode(getPlaybackMode());
    window.switchPage('home');
    loadHomeFeed();
  };

  document.addEventListener('player-ui-mounted', () => {
    // 実際の初期化は unlockApp() から呼ぶ。イベントは読み込み順差の吸収用。
    if (window.lucide) window.lucide.createIcons();
  });

  window.clearSearchResults = function clearSearchResults() {
    document.getElementById('searchResultsSection')?.classList.add('hidden');
    document.getElementById('resultsGrid')?.replaceChildren();
    document.getElementById('searchLoadMoreWrapper')?.classList.add('hidden');
  };

  // --- SPA ルーティング & PiP制御 ---
  window.switchPage = function switchPage(pageId) {
    clearError();
    if (pageId !== 'home') document.getElementById('channelSection')?.classList.add('hidden');

    document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => {
      el.classList.remove('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
      el.classList.add('text-gray-500', 'dark:text-gray-400', 'hover:text-black', 'dark:hover:text-white');
    });

    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.remove('hidden');

    const btnIndex = ['home', 'player', 'settings'].indexOf(pageId);
    if (btnIndex !== -1) {
      const activeBtn = document.querySelectorAll('.nav-btn')[btnIndex];
      if (activeBtn) {
        activeBtn.classList.remove('text-gray-500', 'dark:text-gray-400', 'hover:text-black', 'dark:hover:text-white');
        activeBtn.classList.add('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
      }
    }

    const mainPlayerContainer = document.getElementById('mainPlayerContainer');
    const playerSlot = document.getElementById('playerSlot');
    const pipOverlay = document.getElementById('pipOverlay');
    const videoMeta = document.getElementById('videoMeta');

    if (currentVideoId && mainPlayerContainer) {
      if (pageId === 'player') {
        mainPlayerContainer.classList.remove('pip-active');
        pipOverlay?.classList.add('hidden');
        videoMeta?.classList.remove('hidden');
        playerSlot?.appendChild(mainPlayerContainer);
      } else {
        mainPlayerContainer.classList.add('pip-active');
        pipOverlay?.classList.remove('hidden');
        videoMeta?.classList.add('hidden');
        document.body.appendChild(mainPlayerContainer);
      }
    }
  };

  function proxyUrl(url) {
    return url ? `${PROXY}?url=${encodeURIComponent(url)}` : '';
  }

  function showError(msg) {
    const b = document.getElementById('error');
    if (!b) return;
    b.innerHTML = msg;
    b.classList.remove('hidden');
  }

  window.clearError = function clearError() {
    const b = document.getElementById('error');
    if (!b) return;
    b.textContent = '';
    b.classList.add('hidden');
  };

  function setBusy(b) {
    document.getElementById('loader')?.classList.toggle('hidden', !b);
    const targetSelector = [
      'button[type="submit"]', '#searchInput', '#searchLoadMoreBtn',
      '#channelLoadMoreBtn', '.filter-btn', '#sortSelect', '#videoMeta button'
    ].join(',');

    document.querySelectorAll(targetSelector).forEach(el => {
      el.disabled = b;
      el.classList.toggle('opacity-50', b);
      el.classList.toggle('cursor-not-allowed', b);
    });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function api(action, params) {
    if (isLoading) throw new Error('現在処理中です。しばらくお待ちください。');

    isLoading = true;
    const query = new URLSearchParams({ action, ...params });
    try {
      const response = await fetch(`${API_BASE}?${query}`, {
        method: 'GET', mode: 'cors', credentials: 'omit', headers: { Accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error || `HTTP Error: ${response.status}`);
      return data;
    } catch (err) {
      throw new Error(`通信エラー: ${err.message || 'サーバーに接続できませんでした'}`);
    } finally {
      isLoading = false;
    }
  }

  function resolveDownloadUrl(v) {
    if (!v) return '';
    try { return new URL(v, ZO_API_BASE).href; }
    catch { return ''; }
  }

  async function loadHomeFeed() {
    setBusy(true);
    try {
      const data = await api('search', { q: '音楽 トレンド', limit: '12' });
      renderGrid('homeGrid', data.results || []);
    } catch (e) {
      showError(`ホームの読み込み失敗: ${escapeHtml(e.message)}`);
    } finally {
      setBusy(false);
    }
  }

  window.setFilter = function setFilter(filter, button) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('bg-gray-900', 'dark:bg-white', 'text-white', 'dark:text-black');
      btn.classList.add('bg-white', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
    });
    if (button) {
      button.classList.remove('bg-white', 'dark:bg-zinc-800', 'text-gray-700', 'dark:text-gray-300');
      button.classList.add('bg-gray-900', 'dark:bg-white', 'text-white', 'dark:text-black');
    }
    window.doSearch(true);
  };

  window.setSort = function setSort(sortValue) {
    currentSort = sortValue;
    window.doSearch(true);
  };

  window.doSearch = async function doSearch(reset = true) {
    const input = document.getElementById('searchInput');
    const q = input?.value.trim();
    if (!q) return;

    window.switchPage('home');
    document.getElementById('searchResultsSection')?.classList.remove('hidden');
    clearError();
    setBusy(true);

    if (reset) {
      searchOffset = 0;
      document.getElementById('resultsGrid')?.replaceChildren();
      document.getElementById('searchLoadMoreWrapper')?.classList.add('hidden');
    }

    try {
      const params = { q, limit: String(PAGE_LIMIT), offset: String(searchOffset), sort: currentSort };
      if (currentFilter !== 'all') params.type = currentFilter;

      const data = await api('search', params);
      const results = data.results || [];
      renderGrid('resultsGrid', results, !reset);

      if (results.length >= PAGE_LIMIT) {
        searchOffset += results.length;
        document.getElementById('searchLoadMoreWrapper')?.classList.remove('hidden');
      } else {
        document.getElementById('searchLoadMoreWrapper')?.classList.add('hidden');
      }
    } catch (e) {
      showError(`検索エラー: ${escapeHtml(e.message)}`);
    } finally {
      setBusy(false);
    }
  };

  window.loadMoreSearch = function loadMoreSearch() {
    window.doSearch(false);
  };

  function renderGrid(containerId, results, append = false) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    if (!append && !results.length) {
      grid.innerHTML = '<p class="col-span-full text-center text-gray-400 py-8">該当するデータが見つかりませんでした。</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    results.forEach(item => {
      const card = document.createElement('article');
      card.className = 'group cursor-pointer rounded-xl overflow-hidden bg-white dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800/80 hover:shadow-lg transition duration-200';
      const isChannel = item.type === 'channel' || (!item.thumbnail && item.uploader);

      if (isChannel) {
        card.onclick = () => window.loadChannel(item.uploader_url || item.url, item.title || item.uploader, true);
        card.innerHTML = `
          <div class="p-6 text-center">
            <div class="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 flex items-center justify-center"><i data-lucide="user" class="w-10 h-10 text-gray-400"></i></div>
            <h4 class="font-bold text-base line-clamp-1">${escapeHtml(item.title || item.uploader)}</h4>
            <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300">チャンネル</span>
          </div>`;
      } else {
        card.onclick = () => window.playVideo(item.id, item.title);
        card.innerHTML = `
          <div class="relative aspect-video bg-gray-200 dark:bg-zinc-800 overflow-hidden">
            <img src="${escapeHtml(proxyUrl(item.thumbnail))}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.style.opacity=0" alt="">
          </div>
          <div class="p-3">
            <h4 class="font-bold text-sm line-clamp-2 leading-snug group-hover:text-blue-500 transition">${escapeHtml(item.title || '無題')}</h4>
            <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between"><span class="hover:underline line-clamp-1 uploader-link">${escapeHtml(item.uploader || '')}</span></div>
          </div>`;

        if (item.uploader_url) {
          card.querySelector('.uploader-link')?.addEventListener('click', e => {
            e.stopPropagation();
            window.loadChannel(item.uploader_url, item.uploader, true);
          });
        }
      }
      fragment.append(card);
    });

    append ? grid.appendChild(fragment) : grid.replaceChildren(fragment);
    if (window.lucide) window.lucide.createIcons();
  }

  window.playVideo = async function playVideo(videoId, title) {
    if (!videoId) return;
    clearError();
    setBusy(true);

    currentVideoId = videoId;
    currentVideoTitle = title;
    const mode = getPlaybackMode();

    document.getElementById('playerPlaceholder')?.classList.add('hidden');
    const mainPlayerContainer = document.getElementById('mainPlayerContainer');
    mainPlayerContainer?.classList.remove('hidden');
    document.getElementById('playerSlot')?.appendChild(mainPlayerContainer);
    window.switchPage('player');

    const titleEl = document.getElementById('videoTitleText');
    const badge = document.getElementById('qualityBadge');
    const desc = document.getElementById('videoDesc');
    if (titleEl) titleEl.textContent = title || '';
    if (badge) badge.textContent = `${mode.toUpperCase()} / 解析中...`;
    if (desc) desc.textContent = mode === 'hls' ? 'HLSストリームを準備中...' : '音声付きMP4を準備中...';

    const player = document.getElementById('videoPlayer');
    try {
      let playbackUrl = '';
      if (mode === 'hls') {
        const data = await api('hls', { id: videoId });
        playbackUrl = resolveDownloadUrl(data.playlist_url);
        if (!playbackUrl) throw new Error('HLSプレイリストURLを取得できませんでした。');
        if (badge) badge.textContent = `HLS${data.quality ? ` / ${data.quality}` : ''}`;
        if (desc) desc.textContent = 'HLSストリーム準備完了。再生ボタンを押してください。';
      } else {
        const data = await api('download', { id: videoId, format: 'mp4' });
        playbackUrl = resolveDownloadUrl(data.media_url || data.file_url || data.download_url);
        if (!playbackUrl) throw new Error('音声付きMP4のURLを取得できませんでした。');
        if (badge) badge.textContent = 'MP4 / 音声付き';
        if (desc) desc.textContent = '音声付きMP4準備完了。再生ボタンを押してください。';
      }

      player.onerror = () => {
        const code = player.error ? player.error.code : 0;
        showError(`動画の読み込みに失敗しました（${mode.toUpperCase()} / Code: ${code}）。設定から別の再生方式に切り替えてください。`);
      };
      player.src = playbackUrl;
      player.load();
      player.play().catch(() => {});
    } catch (err) {
      showError(`再生要求エラー: ${escapeHtml(err.message)}`);
    } finally {
      setBusy(false);
    }
  };

  window.loadChannel = async function loadChannel(channelUrl, channelName, reset = true) {
    if (!channelUrl) return;
    clearError();
    setBusy(true);

    if (reset) {
      channelOffset = 0;
      currentChannelUrl = channelUrl;
      currentChannelName = channelName;
      window.switchPage('home');
      document.getElementById('channelSection')?.classList.remove('hidden');
      document.getElementById('channelSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const name = document.getElementById('channelName');
      if (name) name.textContent = channelName ? `${channelName} の動画` : 'チャンネル動画';
      document.getElementById('channelGrid')?.replaceChildren();
      document.getElementById('channelLoadMoreWrapper')?.classList.add('hidden');
    }

    try {
      const data = await api('channel', {
        url: currentChannelUrl, limit: String(PAGE_LIMIT), offset: String(channelOffset)
      });
      const videos = data.results || data.videos || [];
      renderGrid('channelGrid', videos, !reset);

      if (videos.length >= PAGE_LIMIT) {
        channelOffset += videos.length;
        document.getElementById('channelLoadMoreWrapper')?.classList.remove('hidden');
      } else {
        document.getElementById('channelLoadMoreWrapper')?.classList.add('hidden');
      }
    } catch (e) {
      showError(`チャンネル読み込みエラー: ${escapeHtml(e.message)}`);
    } finally {
      setBusy(false);
    }
  };

  window.loadMoreChannel = function loadMoreChannel() {
    window.loadChannel(currentChannelUrl, currentChannelName, false);
  };

  window.downloadMedia = async function downloadMedia(format) {
    if (!currentVideoId) return;
    clearError();
    setBusy(true);
    try {
      const data = await api('download', { id: currentVideoId, format });
      const fileUrl = resolveDownloadUrl(data.media_url || data.download_url || data.file_url);
      if (!fileUrl) throw new Error('ダウンロードURLの生成に失敗しました。');

      const downloadUrl = fileUrl.includes('?') ? `${fileUrl}&download=1` : `${fileUrl}?download=1`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${data.id || currentVideoId}.${format}`;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      showError(`${format.toUpperCase()}の取得エラー: ${escapeHtml(err.message)}`);
    } finally {
      setBusy(false);
    }
  };

  window.stopVideo = function stopVideo() {
    const p = document.getElementById('videoPlayer');
    if (p) {
      p.pause();
      p.removeAttribute('src');
      p.load();
    }
    currentVideoId = '';
    currentVideoTitle = '';
    const container = document.getElementById('mainPlayerContainer');
    container?.classList.add('hidden');
    container?.classList.remove('pip-active');
    document.getElementById('playerPlaceholder')?.classList.remove('hidden');
  };
})();
