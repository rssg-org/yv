<template>
  <div>
    <!-- カテゴリ切り替えボタン -->
    <nav class="category-nav" aria-label="動画カテゴリ">
      <button
        v-for="cat in categories"
        :key="cat.key"
        type="button"
        class="category-button"
        :class="{ active: selectedCategory === cat.key }"
        @click="selectedCategory = cat.key"
      >
        {{ cat.label }}
      </button>
    </nav>
    
    <main>
      <div v-if="loading" class="loading">
        <span class="loading-spinner" aria-hidden="true"></span>
        <span>動画を読み込んでいます...</span>
      </div>
    
      <div v-if="error" class="error">{{ error }}</div>
    
      <VideoList
        v-if="!loading && !error && selectedVideos.length"
        :videos="selectedVideos"
        :title="currentCategoryLabel"
      />
    </main>
    <footer class="footer">
      <p style="margin-block-start: 1px; color: var(--text-primary);">Cordtube Created by<a href="https://cordwise.org">Cordwise(@vister000)</a></p>
      <p style="margin-block-start: 1px; color: var(--text-primary);">Based on しあtube</p>
      <div style="color: var(--text-secondary);">v2.1.1</div>
    </footer>
  </div>
</template>

<script>
import VideoList from "@/components/VideoList.vue";
import { search as searchSiaTube } from "@/services/siatubeApi";
import { normalizeSearchItems } from "@/utils/siatubeAdapters";

export default {
  components: { VideoList },
  data() {
    return {
      trend: {
        trending: [],
        music: [],
        gaming: [],
      },
      loading: false,
      error: null,
      selectedCategory: "trending",
      categories: [
        { key: "trending", label: "急上昇" },
        { key: "gaming", label: "ゲーム" },
        { key: "music", label: "音楽" },
      ],
    };
  },
  computed: {
    selectedVideos() {
      return this.trend[this.selectedCategory] || [];
    },
    currentCategoryLabel() {
      const found = this.categories.find(
        (c) => c.key === this.selectedCategory
      );
      return found ? found.label : "";
    },
  },
  created() {
    document.title = "Usefull Tools";
    this.fetchTrendData();
  },
  methods: {
    async fetchTrendData() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("https://raw.githubusercontent.com/ajgpw/youtubedata/refs/heads/main/trend-base64.json", {redirect: "follow",});
        if (!res.ok) throw new Error("データ取得失敗");
        const data = await res.json();
        this.trend = data;
      } catch (e) {
        this.error = e?.message || "データ取得失敗";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.Accesscount {
  font-size: 1rem;
  color: var(--text-primary);
}
.category-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
  scrollbar-width: none;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.category-nav::-webkit-scrollbar {
  display: none;
}

.category-button {
  flex-shrink: 0;
  padding: 0.55rem 1.15rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.15s ease;
}

.category-button:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.category-button:active {
  transform: scale(0.96);
}

.category-button.active {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
  color: var(--on-accent);
}

.error {
  color: var(--accent-weak);
  padding: 1rem;
}
.loading {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: loading-spin 0.75s linear infinite;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}
main {
  padding: 1rem;
  background-color: var(--bg-primary);
  transition: background-color 0.3s ease;
}
.footer {
  margin-top: 0px;
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

.footer a {
  color: var(--accent-color);
  text-decoration: none;
  margin: 0 0.5rem;
  transition: color 0.2s ease;
}

.footer a:hover {
  text-decoration: underline;
}
</style>
