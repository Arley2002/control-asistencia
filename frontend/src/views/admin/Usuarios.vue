<template>
  <div class="layout">
    <aside class="sidebar">
      <p><router-link to="/admin/dashboard">Dashboard</router-link></p>
      <p><router-link to="/admin/docentes">Docentes</router-link></p>
      <p><router-link to="/admin/reuniones">Reuniones</router-link></p>
      <p><router-link to="/admin/certificados">Certificados</router-link></p>
      <p><button class="button" style="width:100%;background:#ef4444" @click="logout">Cerrar sesión</button></p>
    </aside>
    <main class="content">
      <div class="header-bar">
        <div>
          <p class="eyebrow">Gestión</p>
          <h1>Usuarios</h1>
          <p class="muted">Crea o edita usuarios en un panel lateral con filtros claros.</p>
        </div>
        <div class="header-actions">
          <button class="button" @click="openForm()">Nuevo usuario</button>
        </div>
      </div>
      <div class="card">
        <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap;">
          <input v-model="search" placeholder="Buscar por nombre/correo/usuario" style="flex:1; min-width:220px;" />
          <select v-model="rolFiltro">
            <option value="">Todos los roles</option>
            <option value="1">Administradores</option>
            <option value="2">Secretarios</option>
          </select>
          <button class="button" @click="filter" :disabled="loading">Buscar</button>
          <button class="button" style="background:#6b7280" @click="clearFilters" :disabled="loading">Limpiar</button>
          <div style="margin-left:auto; display:flex; gap:0.5rem; align-items:center;">
            <button class="button" :disabled="page<=1 || loading" @click="prev">Prev</button>
            <span>Página {{ page }} de {{ totalPages }}</span>
            <button class="button" :disabled="page*limit >= total || loading" @click="next">Next</button>
          </div>
        </div>
        <p v-if="loading" class="muted">Cargando usuarios...</p>
        <p v-else-if="data.length===0" class="muted">Sin resultados.</p>
        <table class="table">
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in data" :key="u.id">
              <td>{{ u.nombre }}</td>
              <td>{{ u.correo }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.rol?.nombre }}</td>
              <td>{{ u.estado }}</td>
              <td style="display:flex; gap:0.5rem;">
                <button class="button" style="background:#0ea5e9" @click="edit(u)">Editar</button>
                <button class="button" style="background:#ef4444" @click="remove(u.id)">Inactivar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="showForm" class="drawer" @click.self="closeForm">
        <div class="drawer-panel">
          <div class="drawer-header">
            <div>
              <p class="eyebrow">{{ form.id ? 'Editar usuario' : 'Nuevo usuario' }}</p>
              <h2>{{ form.nombre || 'Completa los datos' }}</h2>
              <p class="muted">Define nombre, correo, rol y estado. La contraseña es obligatoria solo al crear.</p>
            </div>
            <button class="button" style="background:#6b7280" @click="closeForm">Cerrar</button>
          </div>
          <div class="grid">
            <div class="field">
              <label>Nombre</label>
              <input v-model="form.nombre" />
            </div>
            <div class="field">
              <label>Correo</label>
              <input v-model="form.correo" type="email" />
            </div>
            <div class="field">
              <label>Usuario</label>
              <input v-model="form.username" />
            </div>
            <div class="field">
              <label>Contraseña</label>
              <input type="password" v-model="form.password" :placeholder="form.id ? 'Dejar vacío para mantener' : 'Contraseña'" />
            </div>
            <div class="field">
              <label>Rol</label>
              <select v-model="form.rol_id">
                <option value="1">administrador</option>
                <option value="2">secretario</option>
                <option value="3">docente</option>
              </select>
            </div>
            <div class="field">
              <label>Estado</label>
              <select v-model="form.estado">
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
              </select>
            </div>
          </div>
          <div style="margin-top:0.75rem; display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
            <button class="button" @click="save">{{ form.id ? 'Actualizar' : 'Crear' }}</button>
            <button class="button" style="background:#6b7280" @click="resetForm">Limpiar</button>
            <span v-if="error" style="color:red">{{ error }}</span>
            <span v-if="ok" style="color:green">{{ ok }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/http.js';
import { useAuthStore } from '../../stores/auth.js';

const data = ref([]);
const search = ref('');
const rolFiltro = ref('');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1);
const loading = ref(false);
const form = ref({ id: null, nombre: '', correo: '', username: '', password: '', rol_id: 2, estado: 'activo' });
const error = ref('');
const ok = ref('');
const showForm = ref(false);
const router = useRouter();
const auth = useAuthStore();

const load = async () => {
  loading.value = true;
  try {
    const { data: res } = await api.get('/usuarios', { params: { search: search.value, rol: rolFiltro.value, page: page.value, limit: limit.value } });
    data.value = res.data;
    total.value = res.total;
  } catch (e) {
    data.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const filter = () => { page.value = 1; load(); };
const clearFilters = () => { search.value = ''; rolFiltro.value = ''; page.value = 1; load(); };
const prev = () => { if (page.value <= 1) return; page.value -= 1; load(); };
const next = () => { if (page.value * limit.value >= total.value) return; page.value += 1; load(); };

const resetForm = () => {
  form.value = { id: null, nombre: '', correo: '', username: '', password: '', rol_id: 2, estado: 'activo' };
  error.value = '';
  ok.value = '';
  showForm.value = false;
};

const save = async () => {
  error.value = '';
  ok.value = '';
  if (!form.value.nombre || !form.value.username || !form.value.correo) {
    error.value = 'Nombre, usuario y correo son obligatorios';
    return;
  }
  const payload = { ...form.value };
  if (!payload.password) delete payload.password;
  try {
    if (form.value.id) {
      await api.put(`/usuarios/${form.value.id}`, payload);
      ok.value = 'Actualizado';
    } else {
      await api.post('/usuarios', payload);
      ok.value = 'Creado';
    }
    await load();
    resetForm();
    showForm.value = false;
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al guardar';
  }
};

const edit = (u) => {
  form.value = { id: u.id, nombre: u.nombre, correo: u.correo, username: u.username, password: '', rol_id: u.rol?.id || 2, estado: u.estado };
  ok.value = '';
  error.value = '';
  showForm.value = true;
};

const remove = async (id) => {
  if (!confirm('¿Inactivar este usuario?')) return;
  await api.delete(`/usuarios/${id}`);
  await load();
};

const logout = () => {
  auth.logout();
  router.push('/login');
};

const openForm = () => {
  resetForm();
  showForm.value = true;
};

const closeForm = () => {
  showForm.value = false;
};

onMounted(load);
</script>

<style scoped>
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.drawer {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  justify-content: flex-end;
  z-index: 40;
}

.drawer-panel {
  width: min(720px, 95vw);
  max-height: 100vh;
  overflow-y: auto;
  background: #fff;
  padding: 1rem 1.25rem;
  box-shadow: -6px 0 18px rgba(0,0,0,0.08);
  border-left: 1px solid #e5e7eb;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  font-weight: 600;
  color: #111827;
}

.field input,
.field select {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  background: #f9fafb;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

.muted {
  color: #6b7280;
  margin: 0;
}
</style>
