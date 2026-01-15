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
      <h1>Reuniones</h1>
      <div class="card">
        <h3>{{ form.id ? 'Editar reunión' : 'Crear reunión' }}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.5rem;">
          <input v-model="form.nombre" placeholder="Nombre" />
          <select v-model="form.entidad_convocante">
            <option value="ASOINCA">ASOINCA</option>
            <option value="PROVITEC">PROVITEC</option>
            <option value="OTRA">OTRA</option>
          </select>
          <input type="date" v-model="form.fecha" />
          <input v-model="form.descripcion" placeholder="Descripción" />
          <label><input type="checkbox" v-model="form.visible_secretario" /> Visible para secretario</label>
        </div>
        <div style="margin-top:0.5rem; display:flex; gap:0.5rem;">
          <button class="button" @click="save">{{ form.id ? 'Actualizar' : 'Crear' }}</button>
          <button class="button" style="background:#6b7280" @click="resetForm">Limpiar</button>
          <span v-if="error" style="color:red">{{ error }}</span>
          <span v-if="ok" style="color:green">{{ ok }}</span>
        </div>
      </div>
      <div class="card" style="display:flex;gap:0.5rem;align-items:center;">
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
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al guardar';
  }
};

const edit = (r) => {
  form.value = { ...r };
  ok.value = '';
  error.value = '';
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

onMounted(load);
</script>
