<template>
  <div class="layout">
    <div class="dashboard-bar"></div>
    <aside class="sidebar">
      <p><router-link to="/admin/dashboard">Dashboard</router-link></p>
      <p><router-link to="/admin/docentes">Docentes</router-link></p>
      <p><router-link to="/admin/reuniones">Reuniones</router-link></p>
      <p><router-link to="/admin/usuarios">Usuarios</router-link></p>
      <p><router-link to="/admin/certificados">Certificados</router-link></p>
      <p><button class="button" style="width:100%;background:#ef4444" @click="logout">Cerrar sesión</button></p>
    </aside>
    <main class="content">
      <div class="header">
        <div>
          <h1>Certificados</h1>
          <p class="muted">Buscar docente, ver reuniones asistidas y descargar certificados</p>
        </div>
        <div class="actions">
          <button class="button" @click="reset" :disabled="loading">Limpiar</button>
        </div>
      </div>

      <div class="card" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.5rem;align-items:end;">
        <div>
          <label class="muted">Cédula del docente</label>
          <input v-model="cedula" placeholder="Ej: 123456" />
        </div>
        <div>
          <label class="muted">Desde</label>
          <input type="date" v-model="from" />
        </div>
        <div>
          <label class="muted">Hasta</label>
          <input type="date" v-model="to" />
        </div>
        <div>
          <label class="muted">Buscar por reunión</label>
          <input v-model="search" placeholder="Nombre de la reunión" />
        </div>
        <div style="display:flex;gap:0.5rem;">
          <button class="button" @click="buscarDocente" :disabled="loading">Buscar docente</button>
          <button class="button" style="background:#0ea5e9" @click="cargarDatos" :disabled="!docente || loading">Traer datos</button>
        </div>
        <div style="display:flex;gap:0.5rem;">
          <button class="button" style="background:#6b7280" @click="limpiarFiltros" :disabled="loading">Limpiar filtros</button>
        </div>
      </div>

      <div class="card" v-if="mensaje" :class="{ error: esError }">{{ mensaje }}</div>

      <div v-if="docente" class="card">
        <h3>Docente</h3>
        <p><strong>{{ docente.apellidos }} {{ docente.nombres }}</strong> · Cédula {{ docente.cedula }} · Estado {{ docente.estado }}</p>
      </div>

      <div class="card">
        <div v-if="asistencias.length" style="margin-bottom:0.5rem; display:flex; gap:0.5rem; justify-content:flex-end; align-items:center;">
          <button class="button" :disabled="pageAsist<=1" @click="prevAsist">Prev</button>
          <span>Página {{ pageAsist }} de {{ totalPagesAsist }}</span>
          <button class="button" :disabled="pageAsist>=totalPagesAsist" @click="nextAsist">Next</button>
        </div>
        <h3>Reuniones asistidas</h3>
        <p v-if="loadingAsistencias" class="muted">Cargando...</p>
        <p v-else-if="asistencias.length===0" class="muted">Sin asistencias en el rango.</p>
        <table v-else class="table">
          <thead>
            <tr><th>Reunión</th><th>Fecha</th><th>Convoca</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in asistencias" :key="a.id">
              <td>{{ a.reunion?.nombre }}</td>
              <td>{{ a.reunion?.fecha }}</td>
              <td>{{ a.reunion?.entidad_convocante }}</td>
              <td>
                <button class="button" @click="descargarCert(a.reunion?.id)">Descargar PDF</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <h3>Certificados</h3>
        <p v-if="loadingCerts" class="muted">Cargando...</p>
        <table v-else-if="certificados.length" class="table">
          <thead>
            <tr><th>Reunión</th><th>Fecha</th><th>Convoca</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in certificados" :key="c.id">
              <td>{{ c.reunion?.nombre }}</td>
              <td>{{ formatDate(c.reunion?.fecha) }}</td>
              <td>{{ c.reunion?.entidad_convocante }}</td>
              <td><button class="button" @click="descargarCertificado(c)">Descargar</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/http.js';
import { useAuthStore } from '../../stores/auth.js';

const cedula = ref('');
const docente = ref(null);
const from = ref('');
const to = ref('');
const search = ref('');
const asistencias = ref([]);
const certificados = ref([]);
const pageAsist = ref(1);
const limitAsist = ref(10);
const totalAsist = ref(0);
const totalPagesAsist = computed(() => Math.max(1, Math.ceil(totalAsist.value / limitAsist.value || 1)));
const certPorReunion = computed(() => {
  const map = {};
  certificados.value.forEach((c) => {
    if (c.reunion?.id) map[c.reunion.id] = c;
  });
  return map;
});
const mensaje = ref('');
const esError = ref(false);
const loading = ref(false);
const loadingAsistencias = ref(false);
const loadingCerts = ref(false);
const router = useRouter();
const auth = useAuthStore();

const formatDate = (value) => {
  if (!value) return '';
  return `${value}`.split('T')[0];
};

const logout = () => {
  auth.logout();
  router.push('/login');
};

const reset = () => {
  cedula.value = '';
  docente.value = null;
  from.value = '';
  to.value = '';
  asistencias.value = [];
  totalAsist.value = 0;
  pageAsist.value = 1;
  certificados.value = [];
  search.value = '';
  mensaje.value = '';
  esError.value = false;
};

const buscarDocente = async () => {
  if (!cedula.value) {
    mensaje.value = 'Ingrese la cédula';
    esError.value = true;
    return;
  }
  loading.value = true;
  mensaje.value = '';
  esError.value = false;
  try {
    const { data } = await api.get('/docentes', { params: { cedula: cedula.value, limit: 1, page: 1 } });
    if (data.data.length === 0) {
      mensaje.value = 'Docente no encontrado';
      esError.value = true;
      docente.value = null;
      asistencias.value = [];
      certificados.value = [];
      return;
    }
    docente.value = data.data[0];
    pageAsist.value = 1;
    await cargarDatos();
  } catch (e) {
    mensaje.value = e.response?.data?.message || 'Error al buscar docente';
    esError.value = true;
  } finally {
    loading.value = false;
  }
};

const cargarDatos = async () => {
  if (!docente.value) {
    mensaje.value = 'Seleccione un docente primero';
    esError.value = true;
    return;
  }
  pageAsist.value = 1;
  await Promise.all([cargarAsistencias(), cargarCertificados()]);
};

const cargarAsistencias = async () => {
  loadingAsistencias.value = true;
  try {
    const { data } = await api.get(`/asistencias/docentes/${docente.value.id}`, { params: { from: from.value || undefined, to: to.value || undefined, search: search.value || undefined, page: pageAsist.value, limit: limitAsist.value } });
    asistencias.value = data.data || [];
    totalAsist.value = data.total || 0;
  } catch (e) {
    mensaje.value = e.response?.data?.message || 'Error al cargar asistencias';
    esError.value = true;
  } finally {
    loadingAsistencias.value = false;
  }
};

const cargarCertificados = async () => {
  loadingCerts.value = true;
  try {
    const { data } = await api.get(`/certificados/docentes/${docente.value.id}`, { params: { from: from.value || undefined, to: to.value || undefined, search: search.value || undefined, limit: 200 } });
    certificados.value = data.data || [];
  } catch (e) {
    mensaje.value = e.response?.data?.message || 'Error al cargar certificados';
    esError.value = true;
  } finally {
    loadingCerts.value = false;
  }
};

const descargar = (url) => {
  if (!url) return alert('No hay URL del certificado');
  window.open(url, '_blank');
};

const descargarCertificado = async (cert) => {
  if (cert.url_pdf) {
    descargar(cert.url_pdf);
    return;
  }
  if (!docente.value?.id || !cert.reunion?.id) {
    alert('Falta información del docente o reunión');
    return;
  }
  try {
    const resp = await api.get(`/certificados/docentes/${docente.value.id}/reuniones/${cert.reunion.id}/pdf`, { responseType: 'blob' });
    const blob = new Blob([resp.data], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `certificado-${cert.reunion.id}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (e) {
    alert(e.response?.data?.message || `No se pudo descargar el certificado (status ${e.response?.status || 'sin respuesta'})`);
  }
};

const descargarCert = async (reunionId) => {
  if (!reunionId || !docente.value?.id) {
    alert('Falta información de reunión o docente');
    return;
  }
  const cert = certPorReunion.value[reunionId] || { reunion: { id: reunionId }, url_pdf: '' };
  await descargarCertificado(cert);
};

const prevAsist = () => {
  if (pageAsist.value <= 1) return;
  pageAsist.value -= 1;
  cargarAsistencias();
};

const nextAsist = () => {
  if (pageAsist.value >= totalPagesAsist.value) return;
  pageAsist.value += 1;
  cargarAsistencias();
};

const limpiarFiltros = () => {
  from.value = '';
  to.value = '';
  search.value = '';
  pageAsist.value = 1;
  cargarDatos();
};

</script>

<style scoped>
.header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:0.75rem; }
.actions { display:flex; align-items:center; gap:0.5rem; }
.error { color:#ef4444; }
.muted { color:#6b7280; }
</style>
