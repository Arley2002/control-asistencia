<template>
  <div class="layout">
    <aside class="sidebar">
      <p><router-link to="/admin/dashboard">Dashboard</router-link></p>
      <p><router-link to="/admin/docentes">Docentes</router-link></p>
      <p><router-link to="/admin/usuarios">Usuarios</router-link></p>
      <p><router-link to="/admin/certificados">Certificados</router-link></p>
      <p><button class="button" style="width:100%;background:#ef4444" @click="logout">Cerrar sesión</button></p>
    </aside>
    <main class="content">
      <div class="header-bar">
        <div>
          <p class="eyebrow">Gestión</p>
          <h1>Reuniones</h1>
          <p class="muted">Crea o edita reuniones en un panel lateral con los filtros a la vista.</p>
        </div>
        <div class="header-actions">
          <button class="button" @click="openForm()">Nueva reunión</button>
        </div>
      </div>

      <div class="card" style="display:flex;gap:0.5rem;align-items:center; flex-wrap:wrap;">
        <input v-model="search" placeholder="Buscar por nombre" />
        <label>Desde <input type="date" v-model="from" /></label>
        <label>Hasta <input type="date" v-model="to" /></label>
        <button class="button" @click="filter">Filtrar</button>
        <button class="button" style="background:#6b7280" @click="clearFilters">Limpiar</button>
        <div style="margin-left:auto; display:flex; gap:0.5rem; align-items:center;">
          <button class="button" :disabled="page<=1" @click="prev">Prev</button>
          <span>Página {{ page }} de {{ totalPages }}</span>
          <button class="button" :disabled="page*limit >= total" @click="next">Next</button>
        </div>
      </div>
      <div class="card">
        <table class="table">
          <thead>
            <tr><th>Nombre</th><th>Fecha</th><th>Asistentes</th><th>Visible secretario</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in data" :key="r.id">
              <td>{{ r.nombre }}</td>
              <td>{{ r.fecha }}</td>
              <td>{{ r.asistentes_count ?? 0 }}</td>
              <td>{{ r.visible_secretario ? 'Sí' : 'No' }}</td>
              <td style="display:flex; gap:0.5rem;">
                <button class="button" style="background:#0ea5e9" @click="edit(r)">Editar</button>
                <button class="button" style="background:#ef4444" @click="remove(r.id)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="showForm" class="drawer" @click.self="closeForm">
        <div class="drawer-panel">
          <div class="drawer-header">
            <div>
              <p class="eyebrow">{{ form.id ? 'Editar reunión' : 'Nueva reunión' }}</p>
              <h2>{{ form.nombre || 'Completa los datos' }}</h2>
              <p class="muted">Define nombre, fecha y visibilidad para el secretario.</p>
            </div>
            <button class="button" style="background:#6b7280" @click="closeForm">Cerrar</button>
          </div>
          <div class="grid">
            <div class="field">
              <label>Nombre</label>
              <input v-model="form.nombre" />
            </div>
            <div class="field">
              <label>Entidad convocante</label>
              <select v-model="form.entidad_convocante">
                <option value="ASOINCA">ASOINCA</option>
                <option value="PROVITEC">PROVITEC</option>
                <option value="OTRA">OTRA</option>
              </select>
            </div>
            <div class="field">
              <label>Fecha</label>
              <input type="date" v-model="form.fecha" />
            </div>
            <div class="field">
              <label>Descripción</label>
              <input v-model="form.descripcion" />
            </div>
            <div class="field">
              <label>Visible para secretario</label>
              <select v-model="form.visible_secretario">
                <option :value="true">Sí</option>
                <option :value="false">No</option>
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
const form = ref({ id: null, nombre: '', entidad_convocante: 'ASOINCA', fecha: '', descripcion: '', visible_secretario: true });
const error = ref('');
const ok = ref('');
const showForm = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1);
const search = ref('');
const from = ref('');
const to = ref('');
const router = useRouter();
const auth = useAuthStore();

const load = async () => {
  const { data: res } = await api.get('/reuniones', { params: { page: page.value, limit: limit.value, search: search.value, from: from.value || undefined, to: to.value || undefined } });
  data.value = res.data;
  total.value = res.total;
};

const filter = () => {
  page.value = 1;
  load();
};

const clearFilters = () => {
  search.value = '';
  from.value = '';
  to.value = '';
  page.value = 1;
  load();
};

const resetForm = () => {
  form.value = { id: null, nombre: '', entidad_convocante: 'ASOINCA', fecha: '', descripcion: '', visible_secretario: true };
  error.value = '';
  ok.value = '';
  showForm.value = false;
};

const save = async () => {
  error.value = '';
  ok.value = '';
  if (!form.value.nombre || !form.value.fecha) {
    error.value = 'Nombre y fecha son obligatorios';
    return;
  }
  const payload = { ...form.value };
  try {
    if (form.value.id) {
      await api.put(`/reuniones/${form.value.id}`, payload);
      ok.value = 'Actualizada';
    } else {
      await api.post('/reuniones', payload);
      ok.value = 'Creada';
    }
    await load();
    resetForm();
    showForm.value = false;
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al guardar';
  }
};

const edit = (r) => {
  form.value = { ...r };
  ok.value = '';
  error.value = '';
  showForm.value = true;
};

const remove = async (id) => {
  if (!confirm('¿Eliminar esta reunión?')) return;
  await api.delete(`/reuniones/${id}`);
  await load();
};

const prev = () => {
  if (page.value <= 1) return;
  page.value -= 1;
  load();
};

const next = () => {
  if (page.value * limit.value >= total.value) return;
  page.value += 1;
  load();
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
