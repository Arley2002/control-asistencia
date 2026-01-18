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
      <div class="header-bar">
        <div>
          <p class="eyebrow">Gestión</p>
          <h1>Docentes</h1>
          <p class="muted">Crea o edita docentes en un panel lateral sin perder de vista la lista.</p>
        </div>
        <div class="header-actions">
          <button class="button" @click="openForm()">Nuevo docente</button>
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
            <tr><th>Cédula</th><th>Nombre</th><th>Vinculación</th><th>Tipo</th><th>Municipio labora</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in data" :key="d.id">
              <td>{{ d.cedula }}</td>
              <td>{{ d.apellidos }} {{ d.nombres }}</td>
              <td>{{ d.vinculacion }}</td>
              <td>{{ d.tipo_vinculacion }}</td>
              <td>{{ d.municipio_donde_labora?.nombre || '-' }}</td>
              <td>{{ d.estado }}</td>
              <td style="display:flex; gap:0.5rem;">
                <button class="button" style="background:#0ea5e9" @click="edit(d)">Editar</button>
                <button class="button" style="background:#ef4444" @click="remove(d.id)">Inactivar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="showForm" class="drawer" @click.self="closeForm">
        <div class="drawer-panel">
          <div class="drawer-header">
            <div>
              <p class="eyebrow">{{ form.id ? 'Editar docente' : 'Nuevo docente' }}</p>
              <h2>{{ form.nombres || form.apellidos ? `${form.apellidos} ${form.nombres}` : 'Completa los datos' }}</h2>
              <p class="muted">Campos obligatorios para certificados y asistencia.</p>
            </div>
            <button class="button" style="background:#6b7280" @click="closeForm">Cerrar</button>
          </div>

          <div class="grid">
            <div class="field">
              <label>Identificación (cédula)</label>
              <input v-model="form.cedula" />
            </div>
            <div class="field">
              <label>Nombres</label>
              <input v-model="form.nombres" />
            </div>
            <div class="field">
              <label>Apellidos</label>
              <input v-model="form.apellidos" />
            </div>
            <div class="field">
              <label>Número de celular</label>
              <input v-model="form.numero_celular" />
            </div>
            <div class="field">
              <label>Correo electrónico</label>
              <input v-model="form.correo_electronico" type="email" />
            </div>
            <div class="field">
              <label>Fecha de nacimiento</label>
              <input type="date" v-model="form.fecha_nacimiento" />
            </div>
            <div class="field">
              <label>Vinculación</label>
              <select v-model="form.vinculacion">
                <option value="docente">Docente</option>
                <option value="directivo_docente">Directivo docente</option>
                <option value="administrativo">Administrativo</option>
                <option value="pensionado">Pensionado</option>
              </select>
            </div>
            <div class="field">
              <label>Tipo de vinculación</label>
              <select v-model="form.tipo_vinculacion">
                <option value="" disabled>Seleccione tipo de vinculación</option>
                <option v-for="tv in tipoVinculacionActual" :key="tv.value" :value="tv.value">{{ tv.label }}</option>
              </select>
            </div>
            <div class="field" v-if="form.vinculacion !== 'administrativo'">
              <label>Estatuto</label>
              <select v-model="form.estatuto_id">
                <option value="" disabled>Seleccione estatuto</option>
                <option v-for="e in estatutos" :key="e.id" :value="e.id">{{ e.nombre }}</option>
              </select>
            </div>
            <div class="field">
              <label>Departamento de residencia</label>
              <select v-model="form.departamento_residencia">
                <option value="" disabled>Seleccione departamento</option>
                <option v-for="dep in departamentos" :key="dep" :value="dep">{{ dep }}</option>
              </select>
            </div>
            <div class="field">
              <label>Municipio de residencia</label>
              <select v-model="form.municipio_residencia_id" :disabled="!form.departamento_residencia">
                <option value="" disabled>Seleccione municipio</option>
                <option v-for="m in municipiosResidencia" :key="m.id" :value="m.id">{{ m.nombre }}</option>
              </select>
            </div>
            <div class="field">
              <label>Dirección de residencia</label>
              <input v-model="form.direccion_residencia" />
            </div>
            <div class="field">
              <label>{{ labelDepartamentoLabora }}</label>
              <select v-model="departamentoLabora">
                <option value="" disabled>Seleccione departamento</option>
                <option v-for="dep in departamentos" :key="dep" :value="dep">{{ dep }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ labelMunicipioLabora }}</label>
              <select v-model="form.municipio_donde_labora_id" :disabled="!departamentoLabora">
                <option value="" disabled>Seleccione municipio</option>
                <option v-for="m in municipiosLabora" :key="m.id" :value="m.id">{{ m.nombre }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ labelInstitucionLabora }}</label>
              <input v-model="form.institucion_educativa_donde_labora" />
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
  vinculacion: 'docente',
  tipo_vinculacion: 'propiedad',
  estatuto_id: '',
  departamento_residencia: '',
  municipio_residencia_id: '',
  direccion_residencia: '',
  municipio_donde_labora_id: '',
  institucion_educativa_donde_labora: '',
  estado: 'activo'
});
const departamentos = ref([]);
const municipiosResidencia = ref([]);
const municipiosLabora = ref([]);
const departamentoLabora = ref('');
const estatutos = ref([]);
const tipoVinculacionActual = ref([]);
const esPensionadoRetirado = computed(() => form.value.vinculacion === 'pensionado' && form.value.tipo_vinculacion === 'pensionado_retirado');
const labelDepartamentoLabora = computed(() => esPensionadoRetirado.value ? 'Seleccione departamento donde laboró' : 'Seleccione departamento donde labora');
const labelMunicipioLabora = computed(() => esPensionadoRetirado.value ? 'Seleccione municipio donde laboró' : 'Seleccione municipio donde labora');
const labelInstitucionLabora = computed(() => esPensionadoRetirado.value ? 'Institución educativa donde laboró' : 'Institución educativa donde labora');
const tipoVinculacionMap = {
  docente: [
    { value: 'propiedad', label: 'Propiedad' },
    { value: 'provisional_definitivo', label: 'Provisional definitivo' },
    { value: 'provisional_temporal', label: 'Provisional temporal' },
    { value: 'oferente', label: 'Oferente' }
  ],
  directivo_docente: [
    { value: 'rector_propiedad', label: 'Rector en propiedad' },
    { value: 'rector_encargo', label: 'Rector por encargo' },
    { value: 'coordinador_propiedad', label: 'Coordinador en propiedad' },
    { value: 'coordinador_encargo', label: 'Coordinador en encargo' },
    { value: 'director_rural_propiedad', label: 'Director rural en propiedad' },
    { value: 'director_rural_encargo', label: 'Director rural en encargo' }
  ],
  administrativo: [
    { value: 'administrativo_propiedad', label: 'En propiedad' },
    { value: 'administrativo_provisional', label: 'Provisional' }
  ],
  pensionado: [
    { value: 'pensionado_activo', label: 'Activo' },
    { value: 'pensionado_retirado', label: 'Retirado' }
  ]
};
const error = ref('');
const ok = ref('');
const showForm = ref(false);
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
    vinculacion: 'docente',
    tipo_vinculacion: 'propiedad',
    estatuto_id: '',
    departamento_residencia: '',
    municipio_residencia_id: '',
    direccion_residencia: '',
    municipio_donde_labora_id: '',
    institucion_educativa_donde_labora: '',
    estado: 'activo'
  };
  departamentoLabora.value = '';
  error.value = '';
  ok.value = '';
  tipoVinculacionActual.value = tipoVinculacionMap['docente'];
  showForm.value = false;
};

const save = async () => {
  error.value = '';
  ok.value = '';
  try {
    if (!form.value.cedula || !form.value.nombres || !form.value.apellidos || !form.value.numero_celular || !form.value.correo_electronico || !form.value.fecha_nacimiento || !form.value.vinculacion || !form.value.tipo_vinculacion || (!form.value.estatuto_id && form.value.vinculacion !== 'administrativo') || !form.value.departamento_residencia || !form.value.municipio_residencia_id || !form.value.direccion_residencia || !form.value.municipio_donde_labora_id || !form.value.institucion_educativa_donde_labora) {
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
    showForm.value = false;
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
    vinculacion: d.vinculacion || 'docente',
    tipo_vinculacion: d.tipo_vinculacion || 'propiedad',
    estatuto_id: d.estatuto?.id || '',
    departamento_residencia: depResidencia,
    municipio_residencia_id: d.municipio_residencia?.id || '',
    direccion_residencia: d.direccion_residencia || '',
    municipio_donde_labora_id: d.municipio_donde_labora?.id || '',
    institucion_educativa_donde_labora: d.institucion_educativa_donde_labora || '',
    estado: d.estado
  };
  departamentoLabora.value = depLabora;
  tipoVinculacionActual.value = tipoVinculacionMap[form.value.vinculacion] || [];
  ok.value = '';
  error.value = '';

  loadMunicipiosResidencia();
  loadMunicipiosLabora();
  showForm.value = true;
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

const openForm = () => {
  resetForm();
  showForm.value = true;
};

const closeForm = () => {
  showForm.value = false;
};

watch(
  () => form.value.departamento_residencia,
  () => loadMunicipiosResidencia()
);

watch(
  () => form.value.vinculacion,
  (v) => {
    tipoVinculacionActual.value = tipoVinculacionMap[v] || [];
    const first = tipoVinculacionActual.value[0]?.value || '';
    form.value.tipo_vinculacion = first;
    if (v === 'administrativo') {
      form.value.estatuto_id = '';
    }
  }
);

watch(departamentoLabora, () => loadMunicipiosLabora());

onMounted(async () => {
  await Promise.all([loadDepartamentos(), loadCatalogos()]);
  tipoVinculacionActual.value = tipoVinculacionMap[form.value.vinculacion];
  await load();
});
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
  width: min(960px, 95vw);
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
