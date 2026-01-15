<template>
  <div class="layout">
    <aside class="sidebar">
      <p>Admin</p>
      <p><router-link to="/admin/dashboard">Dashboard</router-link></p>
      <p><router-link to="/admin/docentes">Docentes</router-link></p>
      <p><router-link to="/admin/reuniones">Reuniones</router-link></p>
      <p><router-link to="/admin/usuarios">Usuarios</router-link></p>
      <p><router-link to="/admin/certificados">Certificados</router-link></p>
      <p>
        <button
          class="button"
          style="width:100%;background:#ef4444"
          @click="logout"
        >
          Cerrar sesión
        </button>
      </p>
    </aside>

    <main class="content">
      <div class="header">
        <div>
          <h1>Dashboard</h1>
          <p class="muted">Resumen rápido del sistema</p>
        </div>

        <div class="actions">
          <button class="button" @click="load" :disabled="loading">
            Actualizar
          </button>
          <span v-if="loading" class="muted">Cargando...</span>
        </div>
      </div>

      <div class="card">
        <p v-if="error" class="error">{{ error }}</p>
        <p v-else-if="loading" class="muted">Cargando datos...</p>

        <div v-else class="stats-grid">
          <div class="stat-card">
            <div class="stat-title">Docentes</div>
            <div class="stat-value">{{ stats.docentes.total }}</div>
            <div class="stat-sub">
              Activos {{ stats.docentes.activos }} ·
              Inactivos {{ stats.docentes.inactivos }}
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-title">Reuniones</div>
            <div class="stat-value">{{ stats.reuniones.total }}</div>
            <div class="stat-sub">
              Próximas {{ stats.reuniones.proximas }}
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-title">Usuarios</div>
            <div class="stat-value">{{ stats.usuarios.total }}</div>
            <div class="stat-sub">
              Activos {{ stats.usuarios.activos }} ·
              Inactivos {{ stats.usuarios.inactivos }}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/http.js';
import { useAuthStore } from '../../stores/auth.js';

const loading = ref(false);
const error = ref('');
const stats = ref({
  docentes: { total: 0, activos: 0, inactivos: 0 },
  reuniones: { total: 0, proximas: 0 },
  usuarios: { total: 0, activos: 0, inactivos: 0 }
});

const router = useRouter();
const auth = useAuthStore();

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/stats/admin');
    stats.value = data;
  } catch (e) {
    error.value =
      e.response?.data?.message || 'No se pudo cargar el dashboard';
  } finally {
    loading.value = false;
  }
};

const logout = () => {
  auth.logout();
  router.push('/login');
};

onMounted(load);
</script>

<style scoped>
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.stat-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.stat-title {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 0.35rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

.stat-sub {
  color: #4b5563;
  margin-top: 0.25rem;
}

.error {
  color: #ef4444;
}

.muted {
  color: #6b7280;
}
</style>
