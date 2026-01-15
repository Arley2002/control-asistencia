<template>
  <div class="layout">
    <aside class="sidebar">
      <p>Docente</p>
      <p><router-link to="/docente/mis-asistencias">Mis asistencias</router-link></p>
      <p><router-link to="/docente/perfil">Mi perfil</router-link></p>
      <p><button class="button" style="width:100%;background:#ef4444" @click="logout">Cerrar sesión</button></p>
    </aside>
    <main class="content">
      <h1>Completa tus datos</h1>
      <div class="card">
        <div class="form-header">
          <div>
            <p class="eyebrow">Perfil docente</p>
            <h2>Datos personales</h2>
            <p class="muted">Completa todos los campos para generar tus certificados.</p>
          </div>
          <div class="status">
            <span v-if="ok" class="pill pill-success">{{ ok }}</span>
            <span v-if="error" class="pill pill-error">{{ error }}</span>
          </div>
        </div>

        <section class="section">
          <h3>Identificación</h3>
          <div class="form-grid">
            <div class="field compact">
              <label>Cédula</label>
              <input :value="docente?.cedula" disabled />
            </div>
            <div class="field compact">
              <label>Nombres</label>
              <input v-model="form.nombres" />
            </div>
            <div class="field compact">
              <label>Apellidos</label>
              <input v-model="form.apellidos" />
            </div>
            <div class="field compact">
              <label>Número celular</label>
              <input v-model="form.numero_celular" />
            </div>
            <div class="field compact">
              <label>Correo</label>
              <input v-model="form.correo_electronico" type="email" />
            </div>
            <div class="field compact">
              <label>Fecha de nacimiento</label>
              <input v-model="form.fecha_nacimiento" type="date" />
            </div>
            <div class="field">
              <label>Estatuto</label>
              <select v-model="form.estatuto_id">
                <option value="" disabled>Seleccione</option>
                <option v-for="e in estatutos" :key="e.id" :value="e.id">{{ e.nombre }}</option>
              </select>
            </div>
          </div>
        </section>

        <section class="section">
          <h3>Residencia</h3>
          <div class="form-grid">
            <div class="field">
              <label>Departamento</label>
              <select v-model="form.departamento_residencia">
                <option value="" disabled>Seleccione</option>
                <option v-for="d in departamentos" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
            <div class="field">
              <label>Municipio</label>
              <select v-model="form.municipio_residencia_id" :disabled="!form.departamento_residencia">
                <option value="" disabled>Seleccione</option>
                <option v-for="m in municipiosResidencia" :key="m.id" :value="m.id">{{ m.nombre }}</option>
              </select>
            </div>
            <div class="field span-2">
              <label>Dirección</label>
              <input v-model="form.direccion_residencia" />
            </div>
          </div>
        </section>

        <section class="section">
          <h3>Datos laborales</h3>
          <div class="form-grid">
            <div class="field">
              <label>Departamento donde labora</label>
              <select v-model="departamentoLabora">
                <option value="" disabled>Seleccione</option>
                <option v-for="d in departamentos" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
            <div class="field">
              <label>Municipio donde labora</label>
              <select v-model="form.municipio_donde_labora_id" :disabled="!departamentoLabora">
                <option value="" disabled>Seleccione</option>
                <option v-for="m in municipiosLabora" :key="m.id" :value="m.id">{{ m.nombre }}</option>
              </select>
            </div>
            <div class="field span-2">
              <label>Institución educativa</label>
              <input v-model="form.institucion_educativa_donde_labora" />
            </div>
            <div class="field">
              <label>Estado laboral</label>
              <select v-model="form.estado_laboral_id">
                <option value="" disabled>Seleccione</option>
                <option v-for="el in estadosLaborales" :key="el.id" :value="el.id">{{ el.nombre }}</option>
              </select>
            </div>
          </div>
        </section>

        <div class="actions">
          <button class="button" @click="save" :disabled="loading">Guardar</button>
        </div>
      </div>
      <div class="card" v-if="showReminder">
        <strong>Importante:</strong> Completa tus datos para descargar tus certificados.
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/http.js';
import { useAuthStore } from '../../stores/auth.js';

const docente = ref(null);
const form = ref({
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
  estado_laboral_id: ''
});
const loading = ref(false);
const ok = ref('');
const error = ref('');
const router = useRouter();
const auth = useAuthStore();
const departamentos = ref([]);
const municipiosResidencia = ref([]);
const municipiosLabora = ref([]);
const departamentoLabora = ref('');
const estatutos = ref([]);
const estadosLaborales = ref([]);

const showReminder = computed(() => {
  return (
    !docente.value ||
    !docente.value.nombres ||
    !docente.value.apellidos ||
    !docente.value.numero_celular ||
    !docente.value.correo_electronico ||
    !docente.value.municipio_residencia ||
    !docente.value.municipio_donde_labora ||
    !docente.value.estatuto ||
    !docente.value.estado_laboral
  );
});

const logout = () => {
  auth.logout();
  router.push('/login');
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

const load = async () => {
  error.value = '';
  try {
    const { data } = await api.get('/docentes/me');
    docente.value = data;
    form.value = {
      nombres: data.nombres || '',
      apellidos: data.apellidos || '',
      numero_celular: data.numero_celular || '',
      correo_electronico: data.correo_electronico || '',
      fecha_nacimiento: data.fecha_nacimiento || '',
      estatuto_id: data.estatuto?.id || '',
      departamento_residencia: data.municipio_residencia?.departamento_rel?.nombre || data.departamento_residencia || '',
      municipio_residencia_id: data.municipio_residencia?.id || '',
      direccion_residencia: data.direccion_residencia || '',
      municipio_donde_labora_id: data.municipio_donde_labora?.id || '',
      institucion_educativa_donde_labora: data.institucion_educativa_donde_labora || '',
      estado_laboral_id: data.estado_laboral?.id || ''
    };
    departamentoLabora.value = data.municipio_donde_labora?.departamento_rel?.nombre || '';
    if (form.value.departamento_residencia) await loadMunicipiosResidencia();
    if (departamentoLabora.value) await loadMunicipiosLabora();
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo cargar tus datos';
  }
};

const save = async () => {
  error.value = '';
  ok.value = '';
  if (!form.value.nombres ||
      !form.value.apellidos ||
      !form.value.numero_celular ||
      !form.value.correo_electronico ||
      !form.value.estatuto_id ||
      !form.value.departamento_residencia ||
      !form.value.municipio_residencia_id ||
      !form.value.direccion_residencia ||
      !form.value.municipio_donde_labora_id ||
      !form.value.institucion_educativa_donde_labora ||
      !form.value.estado_laboral_id) {
    error.value = 'Por favor completa todos los campos obligatorios';
    return;
  }
  loading.value = true;
  try {
    await api.put('/docentes/me', form.value);
    ok.value = 'Datos guardados';
    await load();
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudieron guardar los datos';
  } finally {
    loading.value = false;
  }
};

watch(
  () => form.value.departamento_residencia,
  () => {
    loadMunicipiosResidencia();
  }
);

watch(departamentoLabora, () => {
  loadMunicipiosLabora();
});

onMounted(async () => {
  await Promise.all([loadDepartamentos(), loadCatalogos()]);
  await load();
});
</script>

<style scoped>
.card {
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}

.form-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0 0 0.15rem 0;
}

.status {
  display: flex;
  gap: 0.5rem;
}

.pill {
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid transparent;
}

.pill-success {
  color: #166534;
  background: #ecfdf3;
  border-color: #bbf7d0;
}

.pill-error {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.section {
  margin-top: 1rem;
  padding-top: 0.25rem;
  border-top: 1px dashed #e5e7eb;
}

.section h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #111827;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field.compact {
  align-items: flex-start;
}

.field label {
  font-weight: 600;
  color: #111827;
}

.field input,
.field select {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  font-size: 0.95rem;
  background: #f9fafb;
}

.field.compact input,
.field.compact select {
  max-width: 220px;
}

.field input:disabled {
  background: #f3f4f6;
  color: #6b7280;
}

.span-2 {
  grid-column: span 2;
}

.actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.muted {
  color: #6b7280;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  .field.compact input,
  .field.compact select {
    max-width: 100%;
  }
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: span 1;
  }
}
</style>
