<script setup lang="ts">
/*
  Based on “Multi-layered Parallax Illustration” by Patrick Westwood  
  Original CodePen: https://codepen.io/patrickwestwood/pen/MyoBaY  
  Licensed under MIT License  
  Copyright (c) 2025 Patrick Westwood  

  Modified by Honahec, 2025  
*/

import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

type HeroAction = {
  text: string;
  link?: string;
  theme?: "brand" | "alt" | "ghost" | "outline" | string;
};

type HeroConfig = {
  name?: string;
  text?: string;
  tagline?: string;
  image?: string;
  actions?: HeroAction[];
};

const props = defineProps<{
  hero?: HeroConfig;
}>();

const hero = computed(() => props.hero ?? null);

const isExternalLink = (link?: string) =>
  typeof link === "string" && /^(https?:)?\/\//.test(link);

const DEFAULT_NAV_HEIGHT = 56;

const layers = ref<HTMLElement[]>([]);
const containerRef = ref<HTMLElement | null>(null);
const heroRef = ref<HTMLElement | null>(null);
const navHeight = ref(DEFAULT_NAV_HEIGHT);
const heroHeight = ref(760);
const showScrollIndicator = ref(true);
const scrollIndicatorHideThreshold = ref(DEFAULT_NAV_HEIGHT * 1.6);
const scrollIndicatorShowThreshold = ref(DEFAULT_NAV_HEIGHT * 0.7);
const TRANSFORM_PROPS = [
  "transform",
  "-webkit-transform",
  "-moz-transform",
  "-ms-transform",
  "-o-transform",
] as const;

const applyParallax = () => {
  if (layers.value.length === 0) {
    return;
  }

  const topDistance = Math.min(window.pageYOffset || 0, heroHeight.value);

  layers.value.forEach((layer) => {
    const depth = Number.parseFloat(layer.dataset.depth ?? "0");
    const movement = Number.isFinite(depth) ? -(topDistance * depth) : 0;
    const translate3d = `translate3d(0, ${movement}px, 0)`;

    TRANSFORM_PROPS.forEach((prop) => {
      layer.style.setProperty(prop, translate3d);
    });
    layer.style.willChange = "transform";
  });
};

const handleScroll = () => {
  const scrollTop = window.pageYOffset || 0;

  if (scrollTop > scrollIndicatorHideThreshold.value) {
    showScrollIndicator.value = false;
  } else if (scrollTop <= scrollIndicatorShowThreshold.value) {
    showScrollIndicator.value = true;
  }

  window.requestAnimationFrame(applyParallax);
};

const updateHeroMetrics = () => {
  const containerEl = containerRef.value;
  const heroEl = heroRef.value;
  const navEl =
    document.querySelector<HTMLElement>(".navbar") ??
    document.querySelector<HTMLElement>(".vp-nav") ??
    document.querySelector<HTMLElement>(".nav-bar");

  const measuredNavHeight = navEl?.getBoundingClientRect().height;
  const resolvedNavHeight =
    typeof measuredNavHeight === "number" && Number.isFinite(measuredNavHeight)
      ? measuredNavHeight
      : DEFAULT_NAV_HEIGHT;

  navHeight.value = resolvedNavHeight;
  scrollIndicatorHideThreshold.value = resolvedNavHeight * 1.6;
  scrollIndicatorShowThreshold.value = resolvedNavHeight * 0.7;

  const heroOffsetHeight =
    heroEl?.offsetHeight ?? Math.max(heroHeight.value - navHeight.value, 0);

  heroHeight.value = heroOffsetHeight + navHeight.value;

  if (containerEl) {
    containerEl.style.setProperty("--nav-height", `${navHeight.value}px`);
    containerEl.style.setProperty("--hero-height", `${heroHeight.value}px`);
    containerEl.style.setProperty(
      "--hero-safe-height",
      `${heroOffsetHeight}px`
    );
  }

  handleScroll();
};

onMounted(() => {
  layers.value = Array.from(
    document.querySelectorAll<HTMLElement>("[data-type='parallax']")
  );

  updateHeroMetrics();
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", updateHeroMetrics);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", updateHeroMetrics);
  layers.value = [];
});
</script>

<template>
  <div class="homepage-parallax" ref="containerRef">
    <section id="hero" ref="heroRef" aria-hidden="true">
      <div class="layer layer-bg" data-type="parallax" data-depth="0.10"></div>
      <div class="layer layer-1" data-type="parallax" data-depth="0.20"></div>
      <div class="layer layer-2" data-type="parallax" data-depth="0.50"></div>
      <div class="layer layer-3" data-type="parallax" data-depth="0.80"></div>
      <div
        class="layer layer-overlay"
        data-type="parallax"
        data-depth="0.85"
      ></div>
      <div class="layer layer-4" data-type="parallax" data-depth="1.00"></div>

      <transition name="scroll-indicator" appear>
        <div
          v-if="showScrollIndicator"
          class="scroll-indicator"
          aria-hidden="true"
        >
          <span class="scroll-indicator__label">向下滑动</span>
          <span class="scroll-indicator__icon">
            <svg
              width="20"
              height="32"
              viewBox="0 0 20 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 2V24M10 24L3 17M10 24L17 17"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </div>
      </transition>
    </section>

    <section id="hero-mobile" aria-hidden="true"></section>

    <section id="content">
      <div class="content-gradient">
        <div v-if="hero" class="hero-card">
          <div class="hero-card__info">
            <p v-if="hero.name" class="hero-card__name">
              {{ hero.name }}
            </p>
            <h1 v-if="hero.text" class="hero-card__title">
              {{ hero.text }}
            </h1>
            <div class="hero-card__tagline">
              <RandomTagline />
            </div>
            <div v-if="hero.actions?.length" class="hero-card__actions">
              <template
                v-for="(action, index) in hero.actions"
                :key="`${action.text}-${index}`"
              >
                <template v-if="action.link">
                  <a
                    v-if="isExternalLink(action.link)"
                    :href="action.link"
                    class="hero-card__action"
                    :class="action.theme ? `is-${action.theme}` : ''"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ action.text }}
                  </a>
                  <RouterLink
                    v-else
                    :to="action.link"
                    class="hero-card__action"
                    :class="action.theme ? `is-${action.theme}` : ''"
                  >
                    {{ action.text }}
                  </RouterLink>
                </template>
                <span v-else class="hero-card__action is-static">
                  {{ action.text }}
                </span>
              </template>
            </div>
          </div>
          <figure v-if="hero.image" class="hero-card__media">
            <img
              :src="hero.image"
              :alt="hero.name || hero.text || 'Homepage illustration'"
            />
          </figure>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
:global(body) {
  padding: 0;
  margin: 0;
  /* background-color: #130d0a; */
  /* color: #fff; */
}

.homepage-parallax {
  background-color: #130d0a;
  color: #ede0d5;
  --nav-height: 56px;
  /* --hero-height-min: 720px;
  --hero-height-max: 1920px;
  --hero-height: clamp(var(--hero-height-min), 82vh, var(--hero-height-max)); */
  --hero-height: 82vh;
  --hero-safe-height: calc(var(--hero-height) - var(--nav-height));
}

#hero {
  height: var(--hero-safe-height);
  min-height: var(--hero-safe-height);
  max-width: 1900px;
  margin: 0 auto;
  overflow: hidden;
  position: relative;
}

#content {
  position: relative;
  z-index: 1;
  margin-top: 0;
  background: linear-gradient(
      180deg,
      #130d0a 0%,
      #18100d 33%,
      rgba(24, 16, 13, 0.35) 70%,
      rgba(24, 16, 13, 0) 100%
    ),
    linear-gradient(180deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg) 100%);
}

.content-gradient {
  min-height: clamp(520px, 70vh, 820px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 160px 32px 140px;
}

.layer {
  background-position: bottom center;
  background-size: auto;
  background-repeat: no-repeat;
  width: 100%;
  height: var(--hero-height);
  min-height: var(--hero-height);
  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;
  pointer-events: none;
}

#content::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(19, 13, 10, 0.6) 0%,
    rgba(19, 13, 10, 0.1) 45%,
    rgba(255, 255, 255, 0) 85%
  );
  z-index: -1;
}

#hero-mobile {
  display: none;
  background: url("https://image.honahec.cc/full-illustration.png") no-repeat
    center bottom / cover;
  height: 320px;
}

.layer-bg {
  background-image: url("https://image.honahec.cc/ilu_bg.jpg");
  background-size: cover;
  background-position: center bottom;
  opacity: 0;
  animation: layerImageFadeIn 1.1s ease-out forwards;
}

.layer-1 {
  background-image: url("https://image.honahec.cc/ilu_03.png");
  background-position: left bottom;
  opacity: 0;
  animation: layerImageFadeIn 3.4s ease-out 0.1s forwards;
}

.layer-2 {
  background-image: url("https://image.honahec.cc/ilu_02.png");
  background-size: cover;
  background-position: center bottom;
}

.layer-3 {
  background-image: url("https://image.honahec.cc/ilu_man.png");
  background-position: right bottom;
}

.layer-4 {
  background-image: url("https://image.honahec.cc/ilu_01.png");
  background-size: cover;
}

.layer-overlay {
  background-image: url("https://image.honahec.cc/ilu_overlay.png");
  background-size: cover;
  background-position: center bottom;
  opacity: 0;
  animation: layerImageFadeIn 1.1s ease-out forwards;
}

@keyframes layerImageFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.scroll-indicator {
  position: absolute;
  bottom: clamp(24px, 7vh, 72px);
  left: 50%;
  transform: translate(-50%, 0);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(243, 228, 211, 0.9);
  pointer-events: none;
  letter-spacing: 0.32em;
  font-size: 12px;
  text-transform: uppercase;
  font-weight: 600;
  opacity: 1;
  transition: opacity 0.45s ease, transform 0.45s ease;
  will-change: opacity, transform;
}

.scroll-indicator__label {
  text-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

.scroll-indicator__icon {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 1px solid rgba(243, 228, 211, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    180deg,
    rgba(19, 13, 10, 0.65),
    rgba(19, 13, 10, 0.3)
  );
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.35);
  animation: indicator-float 3.4s ease-in-out infinite;
}

@keyframes indicator-float {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(12px);
  }
  100% {
    transform: translateY(0);
  }
}

.scroll-indicator-enter-active,
.scroll-indicator-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}

.scroll-indicator-enter-from,
.scroll-indicator-leave-to {
  opacity: 0;
  transform: translate(-50%, 18px);
}

.hero-card {
  position: relative;
  width: min(1150px, 100%);
  display: grid;
  gap: 48px;
  align-items: center;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  color: #f6ede2;
  backdrop-filter: blur(6px);
  background: linear-gradient(
    135deg,
    rgba(12, 9, 7, 0.78) 0%,
    rgba(19, 13, 10, 0.6) 20%,
    rgba(255, 255, 255, 0.08) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 32px;
  padding: clamp(32px, 6vw, 64px);
  box-shadow: 0 20px 60px rgba(10, 6, 4, 0.45);
}

.hero-card__info {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-card__name {
  font-size: 16px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #f1cf9c;
  margin: 0;
}

.hero-card__title {
  font-size: clamp(36px, 5vw, 60px);
  line-height: 1.15;
  margin: 0;
  color: #fff7f0;
  text-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
}

.hero-card__tagline {
  font-size: clamp(18px, 2.2vw, 22px);
  line-height: 1.6;
  margin: 0;
  color: #f3e4d3;
  max-width: 520px;
}

.hero-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 8px;
}

.hero-card__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.9rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 16px;
  line-height: 1;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #140d0a;
  background: rgba(255, 255, 255, 0.9);
  transition: transform 0.2s ease, box-shadow 0.2s ease,
    background-color 0.2s ease, color 0.2s ease;
  text-decoration: none;
  min-width: 160px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
}

.hero-card__action:hover,
.hero-card__action:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.25);
  background: #ffffff;
  color: #140d0a;
}

.hero-card__action.is-brand {
  background: linear-gradient(135deg, #5b6cff 0%, #7f5aff 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 16px 36px rgba(91, 108, 255, 0.35);
}

.hero-card__action.is-brand:hover,
.hero-card__action.is-brand:focus-visible {
  transform: translateY(-3px);
  box-shadow: 0 24px 48px rgba(91, 108, 255, 0.45);
}

.hero-card__action.is-alt {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.45);
  color: #f7eadc;
  box-shadow: none;
}

.hero-card__action.is-alt:hover,
.hero-card__action.is-alt:focus-visible {
  background: rgba(255, 255, 255, 0.16);
  color: #fff7ef;
}

.hero-card__action.is-static {
  cursor: default;
  pointer-events: none;
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.15);
  color: #fff7ef;
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: none;
}

.hero-card__media {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-card__media img {
  width: min(320px, 100%);
  max-width: 100%;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.3);
  background: rgba(0, 0, 0, 0.2);
}

@media only screen and (max-width: 768px) {
  #hero {
    display: none;
  }

  #hero-mobile {
    display: block;
  }

  #content {
    margin-top: 0;
  }

  .content-gradient {
    padding: 96px 24px 72px;
  }

  .hero-card {
    gap: 32px;
    border-radius: 24px;
  }

  .hero-card__actions {
    gap: 12px;
  }
}
</style>
