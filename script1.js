/* ================================================================
   script1.js
   認証（電卓のシークレットコード）と、認証後UIの動的追加を担当
   配置先: https://api.vis0.top/ydl/script1.js
   ================================================================ */
(() => {
  'use strict';

  let unlocked = false;
  let playerUiMounted = false;

  /**
   * 電卓で SECRET_CODE → A が押された際、index.html の calcInput() から呼ばれる。
   * SECRET_CODE と電卓そのものは index.html 側に残しているため、既存動作を維持。
   */
  window.unlockApp = function unlockApp() {
    if (unlocked) return;
    unlocked = true;

    mountPlayerApp();

    const dashboard = document.getElementById('tools-dashboard');
    const app = document.getElementById('app-container');
    const nav = document.getElementById('floating-nav');
    const lockBtn = document.getElementById('lockBtn');
    const brandBtn = document.getElementById('brandBtn');

    if (dashboard) dashboard.style.display = 'none';
    app?.classList.remove('hidden');
    nav?.classList.remove('hidden');
    lockBtn?.classList.remove('hidden');
    brandBtn?.classList.remove('hidden');

    if (typeof window.initializePlayerApp === 'function') {
      window.initializePlayerApp();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.lockApp = function lockApp() {
    if (typeof window.stopVideo === 'function') window.stopVideo();

    document.getElementById('app-container')?.classList.add('hidden');
    document.getElementById('floating-nav')?.classList.add('hidden');
    document.getElementById('lockBtn')?.classList.add('hidden');
    document.getElementById('brandBtn')?.classList.add('hidden');

    const dashboard = document.getElementById('tools-dashboard');
    if (dashboard) dashboard.style.display = '';

    unlocked = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.goMainHome = function goMainHome() {
    if (typeof window.switchPage === 'function') window.switchPage('home');
    if (typeof window.clearSearchResults === 'function') window.clearSearchResults();
    document.getElementById('channelSection')?.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function mountPlayerApp() {
    if (playerUiMounted) return;
    playerUiMounted = true;

    // 左上ブランドボタン
    const brandBtn = document.createElement('button');
    brandBtn.id = 'brandBtn';
    brandBtn.type = 'button';
    brandBtn.onclick = window.goMainHome;
    brandBtn.className = 'hidden fixed top-4 left-4 z-50 px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg transition';
    brandBtn.textContent = 'YT Tool';
    document.body.appendChild(brandBtn);

    // 右上「電卓に戻る」
    const topRight = document.getElementById('topRightControls');
    if (topRight && !document.getElementById('lockBtn')) {
      const lockBtn = document.createElement('button');
      lockBtn.id = 'lockBtn';
      lockBtn.type = 'button';
      lockBtn.onclick = window.lockApp;
      lockBtn.className = 'hidden flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium text-sm shadow-lg transition';
      lockBtn.innerHTML = '<i data-lucide="lock" class="w-4 h-4"></i><span>電卓に戻る</span>';
      topRight.appendChild(lockBtn);
    }

    // メインアプリ全体（認証前のDOMには存在しない）
    document.querySelector('main').insertAdjacentHTML('beforeend', appTemplate());
    document.body.insertAdjacentHTML('beforeend', playerTemplate());
    document.body.insertAdjacentHTML('beforeend', navTemplate());

    if (window.lucide) window.lucide.createIcons();

    // script2 が script1 より先に初期化準備済みの場合にも対応
    document.dispatchEvent(new CustomEvent('player-ui-mounted'));
  }

  function appTemplate() {
    return `
      <section id="app-container" class="hidden pb-24 animate-fade-in">
        <div id="error" class="hidden mb-4 p-4 border border-red-500/30 bg-red-500/10 rounded-xl text-red-500 text-sm"></div>
        <div id="loader" class="hidden py-8 text-center text-gray-400 font-medium animate-pulse">処理中...</div>

        <!-- PAGE: ホーム -->
        <section id="page-home" class="page-view active">
          <form onsubmit="event.preventDefault(); doSearch(true);" class="max-w-2xl mx-auto mb-8 pt-14">
            <div class="flex gap-2 mb-3">
              <input id="searchInput" type="search" placeholder="動画・チャンネルを検索..." autocomplete="off" class="flex-1 px-4 py-3 rounded-full bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white outline-none focus:border-blue-500 shadow-sm">
              <button type="submit" class="px-6 py-3 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black font-semibold hover:opacity-90 transition flex items-center gap-2">
                <i data-lucide="search" class="w-4 h-4"></i><span class="hidden sm:inline">検索</span>
              </button>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3 bg-white/50 dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-gray-200 dark:border-zinc-800">
              <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap mr-1">種別:</span>
                <button type="button" onclick="setFilter('all', this)" class="filter-btn active px-3 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-zinc-700 bg-gray-900 dark:bg-white text-white dark:text-black">すべて</button>
                <button type="button" onclick="setFilter('video', this)" class="filter-btn px-3 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300">動画</button>
                <button type="button" onclick="setFilter('channel', this)" class="filter-btn px-3 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300">チャンネル</button>
                <button type="button" onclick="setFilter('playlist', this)" class="filter-btn px-3 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300">再生リスト</button>
              </div>
              <div class="flex items-center gap-1.5 ml-auto">
                <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">並び替え:</span>
                <select id="sortSelect" onchange="setSort(this.value)" class="text-xs py-1 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-gray-800 dark:text-gray-200 outline-none">
                  <option value="relevance">関連度順</option><option value="upload_date">投稿日順</option><option value="view_count">再生回数順</option><option value="rating">評価順</option>
                </select>
              </div>
            </div>
          </form>

          <div id="searchResultsSection" class="hidden mb-8">
            <div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold">検索結果</h2><button onclick="clearSearchResults()" class="text-sm text-blue-500 hover:underline">閉じる</button></div>
            <div id="resultsGrid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></div>
            <div id="searchLoadMoreWrapper" class="hidden text-center mt-8"><button id="searchLoadMoreBtn" onclick="loadMoreSearch()" class="px-8 py-3 rounded-full bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 font-semibold text-sm">もっと見る</button></div>
          </div>

          <h2 class="text-xl font-bold mb-4 flex items-center gap-2"><i data-lucide="flame" class="w-5 h-5 text-red-500"></i> トレンド / おすすめ</h2>
          <div id="homeGrid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></div>
        </section>

        <!-- PAGE: プレイヤー -->
        <section id="page-player" class="page-view hidden max-w-4xl mx-auto">
          <div id="playerSlot" class="w-full"></div>
          <div id="playerPlaceholder" class="text-center py-12 text-gray-400">
            <i data-lucide="play-circle" class="w-16 h-16 mx-auto mb-3 opacity-40"></i>
            <p>動画が選択されていません。ホームや検索から選択してください。</p>
          </div>
        </section>

        <!-- PAGE: チャンネル -->
        <section id="channelSection" class="hidden mt-8">
          <div id="channelHeader" class="mb-6 p-6 rounded-2xl bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 flex items-center gap-4">
            <div class="p-4 rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300"><i data-lucide="tv" class="w-8 h-8"></i></div>
            <div><h3 id="channelName" class="text-xl font-bold">チャンネル</h3><p class="text-sm text-gray-500 dark:text-gray-400">投稿者のコンテンツを表示中</p></div>
          </div>
          <div id="channelGrid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></div>
          <div id="channelLoadMoreWrapper" class="hidden text-center mt-8">
            <button id="channelLoadMoreBtn" onclick="loadMoreChannel()" class="px-8 py-3 rounded-full bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 transition shadow-sm inline-flex items-center gap-2">
              <i data-lucide="chevron-down" class="w-4 h-4"></i> もっと見る
            </button>
          </div>
        </section>

        <!-- PAGE: 設定 -->
        <section id="page-settings" class="page-view hidden max-w-xl mx-auto">
          <div class="p-6 rounded-2xl bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div class="flex items-center gap-3 border-b border-gray-200 dark:border-zinc-700 pb-4"><i data-lucide="settings" class="w-6 h-6 text-blue-500"></i><h3 class="text-lg font-bold">設定・その他</h3></div>
            <div>
              <label class="block text-sm font-medium mb-2">再生方式</label>
              <select id="playbackMode" onchange="setPlaybackMode(this.value)" class="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white outline-none">
                <option value="hls">HLS（高速起動・推奨）</option><option value="mp4">MP4（互換性重視）</option>
              </select>
            </div>
            <div class="pt-2">
              <button onclick="clearError(); alert('アプリをリセットしました'); location.reload();" class="w-full py-2.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-semibold transition flex items-center justify-center gap-2">
                <i data-lucide="refresh-cw" class="w-4 h-4"></i> アプリをリセット
              </button>
            </div>
          </div>
        </section>
      </section>`;
  }

  function playerTemplate() {
    return `
      <div id="mainPlayerContainer" class="hidden">
        <div class="relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-zinc-800 group">
          <video id="videoPlayer" controls playsinline webkit-playsinline preload="metadata" crossorigin="anonymous" class="w-full h-full object-contain"></video>
          <div id="pipOverlay" class="hidden absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-2 p-2 pointer-events-none group-hover:pointer-events-auto">
            <button onclick="switchPage('player')" class="p-2 rounded-full bg-white/90 text-black hover:bg-white shadow transition" title="拡大する"><i data-lucide="maximize-2" class="w-4 h-4"></i></button>
            <button onclick="stopVideo()" class="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 shadow transition" title="閉じる"><i data-lucide="x" class="w-4 h-4"></i></button>
          </div>
        </div>
        <div id="videoMeta" class="mt-4 p-4 rounded-2xl bg-white dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800">
          <span id="qualityBadge" class="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 mb-2">解析中...</span>
          <h3 id="videoTitleText" class="text-xl font-bold"></h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap" id="videoDesc"></p>
          <div class="flex gap-2 mt-4">
            <button onclick="downloadMedia('mp3')" class="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 font-semibold text-xs flex items-center gap-1.5 transition"><i data-lucide="download" class="w-4 h-4"></i> MP3保存</button>
            <button onclick="downloadMedia('mp4')" class="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 font-semibold text-xs flex items-center gap-1.5 transition"><i data-lucide="download" class="w-4 h-4"></i> MP4保存</button>
          </div>
        </div>
      </div>`;
  }

  function navTemplate() {
    return `
      <div id="floating-nav" class="hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <nav class="flex items-center gap-1 p-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200 dark:border-zinc-700 shadow-2xl">
          <button onclick="switchPage('home')" class="nav-btn active flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"><i data-lucide="home" class="w-4 h-4"></i><span class="hidden sm:inline">ホーム</span></button>
          <button onclick="switchPage('player')" class="nav-btn flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"><i data-lucide="play-circle" class="w-4 h-4"></i><span class="hidden sm:inline">再生中</span></button>
          <button onclick="switchPage('settings')" class="nav-btn flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"><i data-lucide="settings" class="w-4 h-4"></i><span class="hidden sm:inline">設定</span></button>
        </nav>
      </div>`;
  }
})();
