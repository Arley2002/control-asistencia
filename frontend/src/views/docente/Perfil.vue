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

      <div class="card highlight">
        <div class="summary">
          <div>
            <p class="muted small">Tu perfil</p>
            <h2 class="compact">{{ docente?.nombres ? `${docente?.apellidos || ''} ${docente?.nombres || ''}`.trim() : 'Sin nombre' }}</h2>
            <p class="muted">
              {{ form.vinculacion || 'Sin vinculación' }}
              <span v-if="form.tipo_vinculacion"> · {{ form.tipo_vinculacion }}</span>
              <span v-if="form.estatuto_id && form.vinculacion !== 'administrativo'"> · Estatuto {{ estatutoNombre }}</span>
            </p>
          </div>
          <div class="summary-actions">
            <div class="pill" :class="completo ? 'pill-success' : 'pill-warning'">
              {{ completo ? 'Perfil completo' : 'Faltan datos' }}
            </div>
            <button class="button" @click="scrollToForm">Actualizar datos</button>
          </div>
        </div>
        <div class="muted small" v-if="faltantes.length">Pendiente: {{ faltantes.join(', ') }}</div>
      </div>

      <div class="card" ref="formSection">
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
              <label>Vinculación</label>
              <select v-model="form.vinculacion">
                <option value="" disabled>Seleccione</option>
                <option value="docente">Docente</option>
                <option value="directivo_docente">Directivo docente</option>
                <option value="administrativo">Administrativo</option>
                <option value="pensionado">Pensionado</option>
              </select>
            </div>
            <div class="field">
              <label>Tipo de vinculación</label>
              <select v-model="form.tipo_vinculacion">
                <option value="" disabled>Seleccione</option>
                <option v-for="t in tipoVinculacionActual" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="field" v-if="form.vinculacion !== 'administrativo'">
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
              <label>{{ labelDepartamentoLabora }}</label>
              <select v-model="departamentoLabora">
                <option value="" disabled>Seleccione</option>
                <option v-for="d in departamentos" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ labelMunicipioLabora }}</label>
              <select v-model="form.municipio_donde_labora_id" :disabled="!departamentoLabora">
                <option value="" disabled>Seleccione</option>
                <option v-for="m in municipiosLabora" :key="m.id" :value="m.id">{{ m.nombre }}</option>
              </select>
            </div>
            <div class="field span-2">
              <label>{{ labelInstitucionLabora }}</label>
              <input v-model="form.institucion_educativa_donde_labora" />
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

      <div class="card">
        <div class="form-header">
          <div>
            <p class="eyebrow">Seguridad</p>
            <h2>Usuario y contraseña</h2>
            <p class="muted">Actualiza tu usuario y contraseña. Se requiere tu contraseña actual.</p>
          </div>
          <div class="status">
            <span v-if="credOk" class="pill pill-success">{{ credOk }}</span>
            <span v-if="credError" class="pill pill-error">{{ credError }}</span>
          </div>
        </div>
        <div class="form-grid">
          <div class="field compact">
            <label>Usuario</label>
            <input v-model="credentials.username" />
          </div>
          <div class="field compact">
            <label>Contraseña actual</label>
            <input v-model="credentials.current_password" type="password" />
          </div>
          <div class="field compact">
            <label>Nueva contraseña</label>
            <input v-model="credentials.new_password" type="password" />
          </div>
          <div class="field compact">
            <label>Confirmar nueva contraseña</label>
            <input v-model="credentials.confirm" type="password" />
          </div>
        </div>
        <div class="actions">
          <button class="button" @click="saveCredentials" :disabled="loadingCreds">Actualizar credenciales</button>
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

const docente = ref(null);
const form = ref({
  nombres: '',
  apellidos: '',
  numero_celular: '',
  correo_electronico: '',
  fecha_nacimiento: '',
  vinculacion: '',
  tipo_vinculacion: '',
  estatuto_id: '',
  departamento_residencia: '',
  municipio_residencia_id: '',
  direccion_residencia: '',
  municipio_donde_labora_id: '',
  institucion_educativa_donde_labora: ''
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
const estatutoNombre = computed(() => {
  const found = estatutos.value.find((e) => e.id === form.value.estatuto_id);
  return found?.nombre || '';
});
const tipoVinculacionActual = ref([]);
const esPensionadoRetirado = computed(() => form.value.vinculacion === 'pensionado' && form.value.tipo_vinculacion === 'pensionado_retirado');
const labelDepartamentoLabora = computed(() => esPensionadoRetirado.value ? 'Departamento donde laboró' : 'Departamento donde labora');
const labelMunicipioLabora = computed(() => esPensionadoRetirado.value ? 'Municipio donde laboró' : 'Municipio donde labora');
const labelInstitucionLabora = computed(() => esPensionadoRetirado.value ? 'Institución educativa donde laboró' : 'Institución educativa donde labora');
const credentials = ref({ username: '', current_password: '', new_password: '', confirm: '' });
const credOk = ref('');
const credError = ref('');
const loadingCreds = ref(false);
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

const showReminder = computed(() => {
  return (
    !docente.value ||
    !docente.value.nombres ||
    !docente.value.apellidos ||
    !docente.value.numero_celular ||
    !docente.value.correo_electronico ||
    !docente.value.municipio_residencia ||
    !docente.value.municipio_donde_labora ||
    (docente.value.vinculacion !== 'administrativo' && !docente.value.estatuto)
  );
});

const logout = () => {
  auth.logout();
  router.push('/login');
};

const faltantes = computed(() => {
  const req = [
    ['nombres', 'Nombres'],
    ['apellidos', 'Apellidos'],
    ['numero_celular', 'Celular'],
    ['correo_electronico', 'Correo'],
    ['vinculacion', 'Vinculación'],
    ['tipo_vinculacion', 'Tipo de vinculación'],
    ['departamento_residencia', 'Depto. residencia'],
    ['municipio_residencia_id', 'Municipio residencia'],
    ['direccion_residencia', 'Dirección'],
    ['municipio_donde_labora_id', esPensionadoRetirado.value ? 'Municipio donde laboró' : 'Municipio donde labora'],
    ['institucion_educativa_donde_labora', esPensionadoRetirado.value ? 'Institución donde laboró' : 'Institución donde labora']
  ];
  const missing = req.filter(([key]) => !form.value[key]).map(([, label]) => label);
  if (form.value.vinculacion !== 'administrativo' && !form.value.estatuto_id) missing.push('Estatuto');
  return missing;
});

const completo = computed(() => faltantes.value.length === 0);

const formSection = ref(null);
const scrollToForm = () => {
  formSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      vinculacion: data.vinculacion || '',
      tipo_vinculacion: data.tipo_vinculacion || '',
      estatuto_id: data.estatuto?.id || '',
      departamento_residencia: data.municipio_residencia?.departamento_rel?.nombre || data.departamento_residencia || '',
      municipio_residencia_id: data.municipio_residencia?.id || '',
      direccion_residencia: data.direccion_residencia || '',
      municipio_donde_labora_id: data.municipio_donde_labora?.id || '',
      institucion_educativa_donde_labora: data.institucion_educativa_donde_labora || ''
    };
    credentials.value.username = data.usuario?.username || '';
    departamentoLabora.value = data.municipio_donde_labora?.departamento_rel?.nombre || '';
    tipoVinculacionActual.value = tipoVinculacionMap[form.value.vinculacion] || [];
    if (form.value.departamento_residencia) await loadMunicipiosResidencia();
    if (departamentoLabora.value) await loadMunicipiosLabora();
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo cargar tus datos';
  }
};

const saveCredentials = async () => {
  credError.value = '';
  credOk.value = '';
  if (!credentials.value.current_password || !credentials.value.new_password || !credentials.value.confirm) {
    credError.value = 'Completa las contraseñas';
    return;
  }
  if (credentials.value.new_password !== credentials.value.confirm) {
    credError.value = 'Las contraseñas no coinciden';
    return;
  }
  loadingCreds.value = true;
  try {
    const payload = {
      username: credentials.value.username,
      current_password: credentials.value.current_password,
      new_password: credentials.value.new_password
    };
    const { data } = await api.put('/docentes/me/credentials', payload);
    credOk.value = data?.message || 'Credenciales actualizadas';
    credentials.value.current_password = '';
    credentials.value.new_password = '';
    credentials.value.confirm = '';
  } catch (e) {
    credError.value = e.response?.data?.message || 'No se pudieron actualizar las credenciales';
  } finally {
    loadingCreds.value = false;
  }
};

const save = async () => {
  error.value = '';
  ok.value = '';
  if (!form.value.nombres ||
      !form.value.apellidos ||
      !form.value.numero_celular ||
      !form.value.correo_electronico ||
      !form.value.vinculacion ||
      !form.value.tipo_vinculacion ||
      (form.value.vinculacion !== 'administrativo' && !form.value.estatuto_id) ||
      !form.value.departamento_residencia ||
      !form.value.municipio_residencia_id ||
      !form.value.direccion_residencia ||
      !form.value.municipio_donde_labora_id ||
      !form.value.institucion_educativa_donde_labora) {
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

.pill-warning {
  color: #92400e;
  background: #fffbeb;
  border-color: #fcd34d;
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

.muted.small {
  font-size: 0.9rem;
}

.card.highlight {
  border: 1px solid #e5e7eb;
  background: linear-gradient(120deg, #f9fafb 0%, #eef2ff 100%);
}

.summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.summary-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-end;
}

.summary h2.compact {
  margin: 0.1rem 0;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  .field.compact input,
  .field.compact select {
    max-width: 100%;
  }

  .summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-actions {
    align-items: flex-start;
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
