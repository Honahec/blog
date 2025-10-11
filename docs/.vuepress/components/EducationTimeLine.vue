<template>
  <div class="timeline-container">
    <div class="timeline">
      <div class="timeline-line"></div>

      <div
        class="timeline-item"
        v-for="(item, index) in timelineData"
        :key="index"
        :class="item.status"
      >
        <div class="timeline-dot">
          <span class="icon">{{ item.icon }}</span>
        </div>
        <div class="timeline-content">
          <div class="year">{{ item.year }}</div>
          <div class="title">{{ item.title }}</div>
          <div class="period">{{ item.period }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const timelineData = [
  {
    year: "2019",
    title: "青岛中学",
    period: "2019-2025",
    icon: "🏫",
    status: "completed",
  },
  {
    year: "2025",
    title: "上海科技大学",
    period: "2025-2029",
    icon: "🎓",
    status: "current",
  },
  {
    year: "????",
    title: "To be continued...",
    period: "2029-?",
    icon: "✨",
    status: "future",
  },
];
</script>

<style scoped>
.timeline-container {
  padding: 2rem 0;
  overflow-x: auto;
}

.timeline {
  display: flex;
  align-items: center;
  position: relative;
  min-width: 600px;
  padding: 2rem 0;
}

.timeline-line {
  position: absolute;
  top: 45%;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6 0%, #10b981 50%, #f59e0b 100%);
  border-radius: 2px;
  z-index: 1;
}

.timeline-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
}

.timeline-dot {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
  border: 3px solid #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.timeline-item.completed .timeline-dot {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.timeline-item.current .timeline-dot {
  background: linear-gradient(135deg, #10b981, #059669);
  animation: pulse 2s infinite;
}

.timeline-item.future .timeline-dot {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.timeline-dot .icon {
  font-size: 1.5rem;
}

.timeline-content {
  text-align: center;
  max-width: 150px;
}

.year {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
}

.period {
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
}

.timeline-item.current .year {
  color: #10b981;
}

.timeline-item.future .year {
  color: #f59e0b;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  }
}

@media (max-width: 768px) {
  .timeline-container {
    padding: 1rem;
  }

  .timeline {
    min-width: 500px;
  }

  .timeline-dot {
    width: 50px;
    height: 50px;
  }

  .timeline-dot .icon {
    font-size: 1.25rem;
  }

  .year {
    font-size: 1.1rem;
  }

  .title {
    font-size: 0.9rem;
  }

  .period {
    font-size: 0.8rem;
  }
}
</style>
