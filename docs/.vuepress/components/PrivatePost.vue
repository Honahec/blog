<template>
  <section class="private-post">
    <div v-if="!html" class="private-post__panel">
      <p class="private-post__title">这篇文章需要 GitHub 授权</p>
      <p class="private-post__description">
        登录后会按文章可见名单检查你的 GitHub 用户名。
      </p>
      <button class="private-post__button" type="button" :disabled="loading" @click="login">
        {{ loading ? '检查中' : '使用 GitHub 登录' }}
      </button>
      <p v-if="error" class="private-post__error">{{ error }}</p>
    </div>

    <div v-if="loading && html" class="private-post__loading">正在更新内容...</div>
    <article v-if="html" class="private-post__content" v-html="html" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    slug: string;
    apiBase?: string;
  }>(),
  {
    apiBase: import.meta.env.VITE_PRIVATE_API_BASE ?? '',
  },
);

const loading = ref(false);
const error = ref('');
const html = ref('');

const apiBase = () => props.apiBase.replace(/\/$/, '');

const request = async (path: string, init?: RequestInit) => {
  const base = apiBase();
  if (!base) {
    throw new Error('缺少私密文章 API 地址');
  }

  const response = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.message ?? `请求失败：${response.status}`;
    throw Object.assign(new Error(message), { status: response.status });
  }

  return response.json();
};

const loadPost = async () => {
  loading.value = true;
  error.value = '';

  try {
    const data = await request(`/api/private-post/${encodeURIComponent(props.slug)}`);
    html.value = data.html;
  } catch (err) {
    html.value = '';
    error.value = err instanceof Error ? err.message : '无法加载私密文章';
  } finally {
    loading.value = false;
  }
};

const login = async () => {
  const base = apiBase();
  if (!base) {
    error.value = '缺少私密文章 API 地址';
    return;
  }

  const returnTo = encodeURIComponent(window.location.href);
  window.location.href = `${base}/api/auth/github/login?return_to=${returnTo}`;
};

onMounted(() => {
  void loadPost();
});
</script>

<style scoped>
.private-post {
  margin: 2rem 0;
}

.private-post__panel {
  max-width: 32rem;
  padding: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.private-post__title {
  margin: 0 0 0.35rem;
  color: var(--vp-c-text-1);
  font-size: 1rem;
  font-weight: 600;
}

.private-post__description {
  margin: 0 0 1rem;
  color: var(--vp-c-text-2);
}

.private-post__button {
  padding: 0.55rem 0.9rem;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.private-post__button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.private-post__error {
  margin: 0.75rem 0 0;
  color: var(--vp-c-danger-1);
}

.private-post__loading {
  color: var(--vp-c-text-2);
}

.private-post__content :deep(img) {
  max-width: 100%;
  height: auto;
}

.private-post__content :deep(pre) {
  margin: 1.25rem 0;
  padding: 1rem 1.15rem;
  overflow-x: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-code-block-bg, var(--vp-c-bg-soft));
  line-height: 1.65;
}

.private-post__content :deep(pre code) {
  display: block;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: var(--vp-code-block-color, var(--vp-c-text-1));
  font-size: 0.92em;
  white-space: pre;
}

.private-post__content :deep(:not(pre) > code) {
  padding: 0.15em 0.35em;
  border-radius: 4px;
  background: var(--vp-code-bg, var(--vp-c-bg-soft));
  color: var(--vp-code-color, var(--vp-c-brand-1));
  font-size: 0.9em;
}

.private-post__content :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.private-post__content :deep(th),
.private-post__content :deep(td) {
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
}
</style>
