<template>
  <div class="layout">
    <aside class="sidebar">
      <p><router-link to="/admin/dashboard">Dashboard</router-link></p>
      <p><router-link to="/admin/reuniones">Reuniones</router-link></p>
      <p><router-link to="/admin/usuarios">Usuarios</router-link></p>
      <p><router-link to="/admin/certificados">Certificados</router-link></p>
      <p><button class="button" style="width:100%;background:#ef4444" @click="logout">Cerrar sesión</button></p>
    </aside>
    <main class="content">
      <h1>Docentes</h1>
      <div class="card">
        <h3>{{ form.id ? 'Editar docente' : 'Crear docente' }}</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.5rem;">
            <input v-model="form.cedula" placeholder="Identificación (cédula)" />
            <input v-model="form.nombres" placeholder="Nombres" />
            <input v-model="form.apellidos" placeholder="Apellidos" />
            <input v-model="form.numero_celular" placeholder="Número de celular" />
            <input v-model="form.correo_electronico" placeholder="Correo electrónico" />
            <input type="date" v-model="form.fecha_nacimiento" placeholder="Fecha de nacimiento" />

            <select v-model="form.estatuto_id">
              <option value="" disabled>Seleccione estatuto</option>
              <option v-for="e in estatutos" :key="e.id" :value="e.id">{{ e.nombre }}</option>
            </select>

            <select v-model="form.departamento_residencia">
              <option value="" disabled>Seleccione departamento de residencia</option>
              <option v-for="dep in departamentos" :key="dep" :value="dep">{{ dep }}</option>
            </select>

            <select v-model="form.municipio_residencia_id" :disabled="!form.departamento_residencia">
              <option value="" disabled>Seleccione municipio de residencia</option>
              <option v-for="m in municipiosResidencia" :key="m.id" :value="m.id">{{ m.nombre }}</option>
            </select>

            <input v-model="form.direccion_residencia" placeholder="Dirección de residencia" />

            <select v-model="departamentoLabora">
              <option value="" disabled>Seleccione departamento donde labora</option>
              <option v-for="dep in departamentos" :key="dep" :value="dep">{{ dep }}</option>
            </select>

            <select v-model="form.municipio_donde_labora_id" :disabled="!departamentoLabora">
              <option value="" disabled>Seleccione municipio donde labora</option>
              <option v-for="m in municipiosLabora" :key="m.id" :value="m.id">{{ m.nombre }}</option>
            </select>

            <input v-model="form.institucion_educativa_donde_labora" placeholder="Institución educativa donde labora" />

            <select v-model="form.estado_laboral_id">
              <option value="" disabled>Seleccione estado laboral</option>
              <option v-for="el in estadosLaborales" :key="el.id" :value="el.id">{{ el.nombre }}</option>
            </select>

            <select v-model="form.estado">
              <option value="activo">activo</option>
              <option value="inactivo">inactivo</option>
            </select>
          </div>
        <div style="margin-top:0.5rem; display:flex; gap:0.5rem;">
          <button class="button" @click="save">{{ form.id ? 'Actualizar' : 'Crear' }}</button>
          <button class="button" style="background:#6b7280" @click="resetForm">Limpiar</button>
          <span v-if="error" style="color:red">{{ error }}</span>
          <span v-if="ok" style="color:green">{{ ok }}</span>
        </div>
      </div>
      <div class="card" style="display:flex;gap:0.5rem;align-items:center;">
        <input v-model="search" placeholder="Buscar por cédula/nombre" />
        <button class="button" @click="filter">Buscar</button>
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
            <tr><th>Cédula</th><th>Nombre</th><th>Municipio labora</th><th>Estado laboral</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in data" :key="d.id">
              <td>{{ d.cedula }}</td>
              <td>{{ d.apellidos }} {{ d.nombres }}</td>
              <td>{{ d.municipio_donde_labora?.nombre || '-' }}</td>
              <td>{{ d.estado_laboral?.nombre || '-' }}</td>
              <td>{{ d.estado }}</td>
              <td style="display:flex; gap:0.5rem;">
                <button class="button" style="background:#0ea5e9" @click="edit(d)">Editar</button>
                <button class="button" style="background:#ef4444" @click="remove(d.id)">Inactivar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/http.js';
import { useAuthStore } from '../../stores/auth.js';

const data = ref([]);
const search = ref('');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1);
const form = ref({
  id: null,
  cedula: '',
  nombres: '',
  apellidos: '',
  numero_celular: '',
  correo_electronico: '',
  fecha_nacimiento: '',
  estatuto_id: '',
  departamento_residencia: '',
  municipio_residencia_id: '',
  direccion_residencia: '',
  municipio_donde_labora_id: '',
  institucion_educativa_donde_labora: '',
  estado_laboral_id: '',
  estado: 'activo'
});
const departamentos = ref([]);
const municipiosResidencia = ref([]);
const municipiosLabora = ref([]);
const departamentoLabora = ref('');
const estatutos = ref([]);
const estadosLaborales = ref([]);
const error = ref('');
const ok = ref('');
const router = useRouter();
const auth = useAuthStore();

const load = async () => {
  const { data: res } = await api.get('/docentes', { params: { search: search.value, page: page.value, limit: limit.value } });
  data.value = res.data;
  total.value = res.total;
};

const loadDepartamentos = async () => {
  const { data } = await api.get('/municipios/departamentos');
  departamentos.value = data.data || [];
};

const loadCatalogos = async () => {
  const { data } = await api.get('/docentes/catalogos');
  estatutos.value = data.estatutos || [];
  estadosLaborales.value = data.estadosLaborales || [];
};

const loadMunicipiosResidencia = async () => {
  if (!form.value.departamento_residencia) {
    municipiosResidencia.value = [];
    form.value.municipio_residencia_id = '';
    return;
  }
  const { data } = await api.get('/municipios', { params: { departamento: form.value.departamento_residencia, limit: 500 } });
  municipiosResidencia.value = data.data || [];
};

const loadMunicipiosLabora = async () => {
  if (!departamentoLabora.value) {
    municipiosLabora.value = [];
    form.value.municipio_donde_labora_id = '';
    return;
  }
  const { data } = await api.get('/municipios', { params: { departamento: departamentoLabora.value, limit: 500 } });
  municipiosLabora.value = data.data || [];
};

const filter = () => {
  page.value = 1;
  load();
};

const clearFilters = () => {
  search.value = '';
  page.value = 1;
  load();
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

const resetForm = () => {
  form.value = {
    id: null,
    cedula: '',
    nombres: '',
    apellidos: '',
    numero_celular: '',
    correo_electronico: '',
    fecha_nacimiento: '',
    estatuto_id: '',
    departamento_residencia: '',
    municipio_residencia_id: '',
    direccion_residencia: '',
    municipio_donde_labora_id: '',
    institucion_educativa_donde_labora: '',
    estado_laboral_id: '',
    estado: 'activo'
  };
  departamentoLabora.value = '';
  error.value = '';
  ok.value = '';
};

const save = async () => {
  error.value = '';
  ok.value = '';
  try {
    if (!form.value.cedula || !form.value.nombres || !form.value.apellidos || !form.value.numero_celular || !form.value.correo_electronico || !form.value.fecha_nacimiento || !form.value.estatuto_id || !form.value.departamento_residencia || !form.value.municipio_residencia_id || !form.value.direccion_residencia || !form.value.municipio_donde_labora_id || !form.value.institucion_educativa_donde_labora || !form.value.estado_laboral_id) {
      error.value = 'Todos los campos son obligatorios';
      return;
    }
    const payload = { ...form.value };
    if (payload.municipio_residencia_id === '') delete payload.municipio_residencia_id;
    if (payload.municipio_donde_labora_id === '') delete payload.municipio_donde_labora_id;
    if (form.value.id) {
      await api.put(`/docentes/${form.value.id}`, payload);
      ok.value = 'Actualizado';
    } else {
      await api.post('/docentes', payload);
      ok.value = 'Creado';
    }
    await load();
    resetForm();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al guardar';
  }
};

const edit = (d) => {
  const depResidencia = d.municipio_residencia?.departamento_rel?.nombre || d.departamento_residencia || '';
  const depLabora = d.municipio_donde_labora?.departamento_rel?.nombre || '';

  form.value = {
    id: d.id,
    cedula: d.cedula,
    nombres: d.nombres,
    apellidos: d.apellidos,
    numero_celular: d.numero_celular || '',
    correo_electronico: d.correo_electronico || '',
    fecha_nacimiento: d.fecha_nacimiento || '',
    estatuto_id: d.estatuto?.id || '',
    departamento_residencia: depResidencia,
    municipio_residencia_id: d.municipio_residencia?.id || '',
    direccion_residencia: d.direccion_residencia || '',
    municipio_donde_labora_id: d.municipio_donde_labora?.id || '',
    institucion_educativa_donde_labora: d.institucion_educativa_donde_labora || '',
    estado_laboral_id: d.estado_laboral?.id || '',
    estado: d.estado
  };
  departamentoLabora.value = depLabora;
  ok.value = '';
  error.value = '';

  loadMunicipiosResidencia();
  loadMunicipiosLabora();
};

const remove = async (id) => {
  if (!confirm('¿Inactivar este docente?')) return;
  await api.delete(`/docentes/${id}`);
  await load();
};

const logout = () => {
  auth.logout();
  router.push('/login');
};

watch(
  () => form.value.departamento_residencia,
  () => loadMunicipiosResidencia()
);

watch(departamentoLabora, () => loadMunicipiosLabora());

onMounted(async () => {
  await Promise.all([loadDepartamentos(), loadCatalogos()]);
  await load();
});
</script>
