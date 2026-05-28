<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import type * as ThreeNamespace from "three";

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

type Vec4 = [number, number, number, number];

const props = defineProps<{
  hero?: HeroConfig;
}>();

const hero = computed(() => props.hero ?? null);

const isExternalLink = (link?: string) =>
  typeof link === "string" && /^(https?:)?\/\//.test(link);

const rootRef = ref<HTMLElement | null>(null);
const canvasHostRef = ref<HTMLElement | null>(null);
const showScrollIndicator = ref(true);

let animationFrame = 0;
let renderer: ThreeNamespace.WebGLRenderer | null = null;
let scene: ThreeNamespace.Scene | null = null;
let camera: ThreeNamespace.PerspectiveCamera | null = null;
let hypercubeGroup: ThreeNamespace.Group | null = null;
let edgeCoreGeometry: ThreeNamespace.CylinderGeometry | null = null;
let edgeGlowGeometry: ThreeNamespace.CylinderGeometry | null = null;
let vertexCoreGeometry: ThreeNamespace.SphereGeometry | null = null;
let vertexGlowGeometry: ThreeNamespace.SphereGeometry | null = null;
let edgeMaterial: ThreeNamespace.MeshBasicMaterial | null = null;
let edgeGlowMaterial: ThreeNamespace.MeshBasicMaterial | null = null;
let vertexMaterial: ThreeNamespace.MeshBasicMaterial | null = null;
let vertexGlowMaterial: ThreeNamespace.MeshBasicMaterial | null = null;
let unitY: ThreeNamespace.Vector3 | null = null;
let edgeDirection: ThreeNamespace.Vector3 | null = null;
const edgeCoreMeshes: ThreeNamespace.Mesh[] = [];
const edgeGlowMeshes: ThreeNamespace.Mesh[] = [];
const vertexCoreMeshes: ThreeNamespace.Mesh[] = [];
const vertexGlowMeshes: ThreeNamespace.Mesh[] = [];
let animationStart = 0;
let resizeObserver: ResizeObserver | null = null;
let themeObserver: MutationObserver | null = null;
let reducedMotionQuery: MediaQueryList | null = null;

const vertices: Vec4[] = [];
const edges: [number, number][] = [];

for (const x of [-1, 1]) {
  for (const y of [-1, 1]) {
    for (const z of [-1, 1]) {
      for (const w of [-1, 1]) {
        vertices.push([x, y, z, w]);
      }
    }
  }
}

for (let a = 0; a < vertices.length; a += 1) {
  for (let b = a + 1; b < vertices.length; b += 1) {
    const differences = vertices[a].reduce(
      (count, value, index) => count + (value !== vertices[b][index] ? 1 : 0),
      0,
    );

    if (differences === 1) {
      edges.push([a, b]);
    }
  }
}

const rotatePlane = (
  point: Vec4,
  axisA: number,
  axisB: number,
  angle: number,
) => {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const a = point[axisA];
  const b = point[axisB];

  point[axisA] = a * cos - b * sin;
  point[axisB] = a * sin + b * cos;
};

const projectVertex = (baseVertex: Vec4, time: number) => {
  const point: Vec4 = [...baseVertex];
  const unfold = 0;
  const reducedMotion = reducedMotionQuery?.matches ?? false;
  const idleTime = reducedMotion ? 0 : time;

  rotatePlane(point, 0, 1, idleTime * 0.22 + unfold * 0.85);
  rotatePlane(point, 0, 2, idleTime * 0.17 + 0.35);
  rotatePlane(point, 1, 3, idleTime * 0.19 + unfold * 1.2);
  rotatePlane(point, 2, 3, idleTime * 0.13 - unfold * 0.55);

  const wDirection = baseVertex[3] > 0 ? 1 : -1;

  point[0] += wDirection * unfold * 2.2 + baseVertex[0] * unfold * 0.55;
  point[1] += baseVertex[1] * unfold * 0.34 + wDirection * unfold * 0.12;
  point[2] += baseVertex[2] * unfold * 0.38;
  point[3] += wDirection * unfold * 0.42;

  const perspective = 3.7;
  const projection = perspective / (perspective - point[3] * 0.58);
  const scale = 1.34 - unfold * 0.08;

  return {
    x: point[0] * projection * scale,
    y: point[1] * projection * scale,
    z: point[2] * projection * scale,
  };
};

const readThemeColor = (name: string, fallback: string) => {
  const root = rootRef.value;

  if (!root) {
    return fallback;
  }

  return getComputedStyle(root).getPropertyValue(name).trim() || fallback;
};

const updateThemeColors = () => {
  edgeMaterial?.color.set(readThemeColor("--homepage-v2-line", "#202938"));
  edgeGlowMaterial?.color.set(readThemeColor("--homepage-v2-glow", "#2563eb"));
  vertexMaterial?.color.set(readThemeColor("--homepage-v2-point", "#2563eb"));
  vertexGlowMaterial?.color.set(
    readThemeColor("--homepage-v2-glow", "#2563eb"),
  );
};

const updateScrollIndicator = () => {
  showScrollIndicator.value = (window.scrollY || 0) < 24;
};

const resizeRenderer = () => {
  const host = canvasHostRef.value;

  if (!host || !renderer || !camera) {
    return;
  }

  const { width, height } = host.getBoundingClientRect();
  const resolvedWidth = Math.max(width, 1);
  const resolvedHeight = Math.max(height, 1);

  renderer.setSize(resolvedWidth, resolvedHeight, false);
  camera.aspect = resolvedWidth / resolvedHeight;
  camera.updateProjectionMatrix();
};

const renderFrame = () => {
  if (
    !renderer ||
    !scene ||
    !camera ||
    !unitY ||
    !edgeDirection ||
    !hypercubeGroup ||
    !edgeMaterial ||
    !edgeGlowMaterial ||
    !vertexGlowMaterial ||
    !vertexMaterial
  ) {
    return;
  }

  const time = (performance.now() - animationStart) / 1000;
  const resolvedVertices = vertices.map((vertex) =>
    projectVertex(vertex, time),
  );

  edges.forEach(([start, end], index) => {
    const first = resolvedVertices[start];
    const second = resolvedVertices[end];
    const core = edgeCoreMeshes[index];
    const glow = edgeGlowMeshes[index];
    const dx = second.x - first.x;
    const dy = second.y - first.y;
    const dz = second.z - first.z;

    edgeDirection.set(dx, dy, dz);

    const length = edgeDirection.length();

    if (length <= 0) {
      return;
    }

    edgeDirection.normalize();

    for (const mesh of [glow, core]) {
      mesh.position.set(
        (first.x + second.x) / 2,
        (first.y + second.y) / 2,
        (first.z + second.z) / 2,
      );
      mesh.quaternion.setFromUnitVectors(unitY, edgeDirection);
      mesh.scale.set(1, length, 1);
    }
  });

  resolvedVertices.forEach((vertex, index) => {
    vertexGlowMeshes[index].position.set(vertex.x, vertex.y, vertex.z);
    vertexCoreMeshes[index].position.set(vertex.x, vertex.y, vertex.z);
  });

  edgeMaterial.opacity = 0.88;
  edgeGlowMaterial.opacity = 0.2;
  vertexMaterial.opacity = 0.92;
  vertexGlowMaterial.opacity = 0.34;
  hypercubeGroup.rotation.x = -0.22;
  hypercubeGroup.rotation.y = 0.26;
  hypercubeGroup.rotation.z = -0.08;
  hypercubeGroup.position.x = 0.18;
  hypercubeGroup.position.y = 0;
  hypercubeGroup.position.z = 0;

  renderer.render(scene, camera);
  animationFrame = window.requestAnimationFrame(renderFrame);
};

const setupScene = async () => {
  const host = canvasHostRef.value;

  if (!host) {
    return;
  }

  const THREE = await import("three");

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.08, 7.4);
  animationStart = performance.now();
  unitY = new THREE.Vector3(0, 1, 0);
  edgeDirection = new THREE.Vector3();

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearAlpha(0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);

  hypercubeGroup = new THREE.Group();
  edgeCoreGeometry = new THREE.CylinderGeometry(0.012, 0.012, 1, 10);
  edgeGlowGeometry = new THREE.CylinderGeometry(0.046, 0.046, 1, 12);
  vertexCoreGeometry = new THREE.SphereGeometry(0.038, 16, 12);
  vertexGlowGeometry = new THREE.SphereGeometry(0.11, 16, 12);
  edgeMaterial = new THREE.MeshBasicMaterial({
    color: readThemeColor("--homepage-v2-line", "#202938"),
    transparent: true,
    opacity: 0.88,
  });
  edgeGlowMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: readThemeColor("--homepage-v2-glow", "#2563eb"),
    depthWrite: false,
    transparent: true,
    opacity: 0.2,
  });
  vertexMaterial = new THREE.MeshBasicMaterial({
    color: readThemeColor("--homepage-v2-point", "#2563eb"),
    transparent: true,
    opacity: 0.92,
  });
  vertexGlowMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: readThemeColor("--homepage-v2-glow", "#2563eb"),
    depthWrite: false,
    transparent: true,
    opacity: 0.34,
  });

  edges.forEach(() => {
    const glow = new THREE.Mesh(edgeGlowGeometry, edgeGlowMaterial);
    const core = new THREE.Mesh(edgeCoreGeometry, edgeMaterial);

    edgeGlowMeshes.push(glow);
    edgeCoreMeshes.push(core);
    hypercubeGroup?.add(glow);
    hypercubeGroup?.add(core);
  });

  vertices.forEach(() => {
    const glow = new THREE.Mesh(vertexGlowGeometry, vertexGlowMaterial);
    const core = new THREE.Mesh(vertexCoreGeometry, vertexMaterial);

    vertexGlowMeshes.push(glow);
    vertexCoreMeshes.push(core);
    hypercubeGroup?.add(glow);
    hypercubeGroup?.add(core);
  });

  scene.add(hypercubeGroup);

  resizeRenderer();
  updateThemeColors();
  renderFrame();
};

onMounted(() => {
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  updateScrollIndicator();
  setupScene();

  window.addEventListener("scroll", updateScrollIndicator, { passive: true });
  window.addEventListener("resize", resizeRenderer);

  resizeObserver = new ResizeObserver(resizeRenderer);

  if (canvasHostRef.value) {
    resizeObserver.observe(canvasHostRef.value);
  }

  themeObserver = new MutationObserver(updateThemeColors);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });
});

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame);
  window.removeEventListener("scroll", updateScrollIndicator);
  window.removeEventListener("resize", resizeRenderer);
  resizeObserver?.disconnect();
  themeObserver?.disconnect();

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement);
  }

  edgeCoreGeometry?.dispose();
  edgeGlowGeometry?.dispose();
  vertexCoreGeometry?.dispose();
  vertexGlowGeometry?.dispose();
  edgeMaterial?.dispose();
  edgeGlowMaterial?.dispose();
  vertexMaterial?.dispose();
  vertexGlowMaterial?.dispose();
  renderer?.dispose();
  edgeCoreMeshes.length = 0;
  edgeGlowMeshes.length = 0;
  vertexCoreMeshes.length = 0;
  vertexGlowMeshes.length = 0;
});
</script>

<template>
  <div ref="rootRef" class="homepage-v2">
    <section class="homepage-v2__stage">
      <div class="homepage-v2__sticky">
        <div
          ref="canvasHostRef"
          class="homepage-v2__canvas"
          aria-hidden="true"
        ></div>
        <div v-if="hero" class="homepage-v2__copy">
          <div class="homepage-v2__identity">
            <img
              v-if="hero.image"
              class="homepage-v2__avatar"
              :src="hero.image"
              :alt="hero.name || hero.text || 'Homepage avatar'"
            />
            <p v-if="hero.name" class="homepage-v2__name">
              {{ hero.name }}
            </p>
          </div>
          <h1 v-if="hero.text" class="homepage-v2__title">
            {{ hero.text }}
          </h1>
          <div class="homepage-v2__tagline">
            <RandomTagline />
          </div>
          <div v-if="hero.actions?.length" class="homepage-v2__actions">
            <template
              v-for="(action, index) in hero.actions"
              :key="`${action.text}-${index}`"
            >
              <template v-if="action.link">
                <a
                  v-if="isExternalLink(action.link)"
                  :href="action.link"
                  class="homepage-v2__action"
                  :class="action.theme ? `is-${action.theme}` : ''"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ action.text }}
                </a>
                <RouterLink
                  v-else
                  :to="action.link"
                  class="homepage-v2__action"
                  :class="action.theme ? `is-${action.theme}` : ''"
                >
                  {{ action.text }}
                </RouterLink>
              </template>
              <span v-else class="homepage-v2__action is-static">
                {{ action.text }}
              </span>
            </template>
          </div>
        </div>

        <transition name="homepage-v2-scroll" appear>
          <div
            v-if="showScrollIndicator"
            class="homepage-v2__scroll"
            aria-hidden="true"
          >
            <span></span>
          </div>
        </transition>
      </div>
    </section>
  </div>
</template>

<style scoped>
.homepage-v2 {
  --nav-height: 56px;
  --homepage-v2-bg: #fbfbf8;
  --homepage-v2-bg-soft: #f1f5f1;
  --homepage-v2-text: #111827;
  --homepage-v2-muted: #5f6b7a;
  --homepage-v2-line: #1f2937;
  --homepage-v2-point: #2563eb;
  --homepage-v2-glow: #2563eb;
  --homepage-v2-border: rgba(17, 24, 39, 0.14);
  --homepage-v2-brand: #2457d6;
  background:
    linear-gradient(180deg, var(--homepage-v2-bg) 0%, #ffffff 62%),
    var(--homepage-v2-bg);
  color: var(--homepage-v2-text);
  overflow: clip;
}

:global([data-theme="dark"] .homepage-v2),
:global(.dark .homepage-v2) {
  --homepage-v2-bg: #05070b;
  --homepage-v2-bg-soft: #111827;
  --homepage-v2-text: #f8fafc;
  --homepage-v2-muted: #a7b1c2;
  --homepage-v2-line: #f8fafc;
  --homepage-v2-point: #8bd3ff;
  --homepage-v2-glow: #8bd3ff;
  --homepage-v2-border: rgba(248, 250, 252, 0.16);
  --homepage-v2-brand: #8bd3ff;
  background:
    linear-gradient(180deg, #05070b 0%, #0a0f18 58%, var(--vp-c-bg) 100%),
    var(--homepage-v2-bg);
}

.homepage-v2__stage {
  position: relative;
  min-height: calc(100vh - var(--nav-height));
}

.homepage-v2__sticky {
  position: relative;
  display: grid;
  grid-template-columns: minmax(380px, 0.86fr) minmax(320px, 1.14fr);
  align-items: center;
  gap: clamp(28px, 5vw, 72px);
  min-height: calc(100vh - var(--nav-height));
  padding: clamp(36px, 7vw, 96px) clamp(24px, 6vw, 96px);
  isolation: isolate;
}

.homepage-v2__sticky::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background:
    linear-gradient(
      120deg,
      rgba(36, 87, 214, 0.08),
      transparent 38%,
      rgba(39, 176, 130, 0.1) 100%
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0 48px,
      rgba(31, 41, 55, 0.035) 48px 49px
    );
  opacity: 0.9;
}

:global([data-theme="dark"] .homepage-v2__sticky::before),
:global(.dark .homepage-v2__sticky::before) {
  background:
    linear-gradient(
      120deg,
      rgba(139, 211, 255, 0.11),
      transparent 40%,
      rgba(42, 196, 149, 0.09) 100%
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0 48px,
      rgba(248, 250, 252, 0.045) 48px 49px
    );
}

.homepage-v2__copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: min(600px, 100%);
  min-width: 0;
  gap: 22px;
}

.homepage-v2__identity {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.homepage-v2__avatar {
  width: 44px;
  height: 44px;
  min-width: 44px;
  aspect-ratio: 1;
  flex: 0 0 auto;
  border-radius: 50%;
  border: 1px solid var(--homepage-v2-border);
  background: var(--homepage-v2-bg-soft);
  display: block;
  object-fit: cover;
  overflow: hidden;
}

.homepage-v2__name {
  margin: 0;
  color: var(--homepage-v2-muted);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.homepage-v2__title {
  margin: 0;
  max-width: 10ch;
  color: var(--homepage-v2-text);
  font-size: clamp(44px, 7vw, 96px);
  font-weight: 760;
  line-height: 0.98;
  letter-spacing: 0;
}

.homepage-v2__tagline {
  min-height: 2.9em;
  margin: 0;
  color: var(--homepage-v2-muted);
  font-size: clamp(17px, 2vw, 22px);
  line-height: 1.55;
}

.homepage-v2__actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  margin-top: 6px;
  max-width: 100%;
}

.homepage-v2__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 126px;
  flex: 0 0 auto;
  padding: 0 18px;
  border: 1px solid var(--homepage-v2-border);
  border-radius: 8px;
  color: var(--homepage-v2-text);
  background: color-mix(in srgb, var(--homepage-v2-bg) 82%, transparent);
  font-size: 15px;
  font-weight: 650;
  line-height: 1;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.homepage-v2__action:hover,
.homepage-v2__action:focus-visible {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--homepage-v2-brand) 55%, transparent);
  color: var(--homepage-v2-brand);
}

.homepage-v2__action.is-brand {
  border-color: var(--homepage-v2-brand);
  color: #ffffff;
  background: var(--homepage-v2-brand);
}

.homepage-v2__action.is-brand:hover,
.homepage-v2__action.is-brand:focus-visible {
  color: #ffffff;
  background: color-mix(in srgb, var(--homepage-v2-brand) 88%, #000000);
}

.homepage-v2__action.is-static {
  cursor: default;
  pointer-events: none;
  opacity: 0.62;
}

.homepage-v2__canvas {
  position: relative;
  z-index: 1;
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  width: min(76vw, 1040px);
  height: min(84vh, 820px);
  min-height: 560px;
  margin-right: max(-18vw, -240px);
}

.homepage-v2__canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.homepage-v2__scroll {
  position: absolute;
  left: 50%;
  bottom: clamp(24px, 6vh, 64px);
  width: 28px;
  height: 44px;
  border: 1px solid var(--homepage-v2-border);
  border-radius: 999px;
  transform: translateX(-50%);
}

.homepage-v2__scroll span {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--homepage-v2-brand);
  transform: translateX(-50%);
  animation: homepage-v2-scroll-dot 1.8s ease-in-out infinite;
}

.homepage-v2-scroll-enter-active,
.homepage-v2-scroll-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}

.homepage-v2-scroll-enter-from,
.homepage-v2-scroll-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

@keyframes homepage-v2-scroll-dot {
  0% {
    opacity: 0;
    transform: translate(-50%, 0);
  }
  30%,
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .homepage-v2__copy,
  .homepage-v2__action,
  .homepage-v2__scroll span {
    animation: none;
    transition: none;
  }
}

@media (max-width: 820px) {
  .homepage-v2__stage {
    min-height: calc(100vh - var(--nav-height));
  }

  .homepage-v2__sticky {
    position: relative;
    grid-template-columns: 1fr;
    align-content: center;
    min-height: calc(100svh - var(--nav-height));
    padding: 52px 20px 84px;
    overflow: hidden;
  }

  .homepage-v2__copy {
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
    gap: 18px;
  }

  .homepage-v2__title {
    max-width: 9ch;
    font-size: clamp(42px, 15vw, 72px);
  }

  .homepage-v2__tagline {
    font-size: 16px;
  }

  .homepage-v2__canvas {
    position: absolute;
    top: 4vh;
    right: -42vw;
    grid-column: auto;
    grid-row: auto;
    width: min(138vw, 680px);
    height: 62vh;
    min-height: 360px;
    margin-right: 0;
    opacity: 0.34;
    transform: none;
  }

  .homepage-v2__actions {
    width: 100%;
    max-width: 280px;
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .homepage-v2__action {
    min-width: 0;
    width: 100%;
    flex: 0 0 auto;
  }
}

@media (min-width: 821px) and (max-width: 1100px) {
  .homepage-v2__sticky {
    grid-template-columns: minmax(340px, 0.9fr) minmax(280px, 1.1fr);
  }

  .homepage-v2__title {
    font-size: clamp(52px, 7vw, 78px);
  }
}
</style>
