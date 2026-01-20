<template>
  <div class="layout">
    <aside class="sidebar">
      <p>Docente</p>
      <p><router-link to="/docente/mis-asistencias">Mis asistencias</router-link></p>
      <p><router-link to="/docente/perfil">Mi perfil</router-link></p>
      <p><button class="button" style="width:100%;background:#ef4444" @click="logout">Cerrar sesión</button></p>
    </aside>
    <main class="content">
      <h1>Mis asistencias</h1>
      <div class="card">
        <div style="margin-bottom:0.5rem; display:flex; gap:0.5rem; align-items:center;">
          <input v-model="search" placeholder="Buscar por reunión" />
          <label class="muted">Desde <input type="date" v-model="from" /></label>
          <label class="muted">Hasta <input type="date" v-model="to" /></label>
          <button class="button" @click="filtrar">Filtrar</button>
          <button class="button" style="background:#6b7280" @click="limpiar">Limpiar</button>
          <div style="margin-left:auto; display:flex; gap:0.5rem; align-items:center;">
            <button class="button" :disabled="page<=1" @click="prev">Prev</button>
            <span>Página {{ page }} de {{ totalPages }}</span>
            <button class="button" :disabled="page>=totalPages" @click="next">Next</button>
          </div>
        </div>
        <p v-if="loading" class="muted">Cargando...</p>
        <p v-else-if="data.length===0" class="muted">Sin asistencias.</p>
        <table v-else class="table">
          <thead>
            <tr><th>Reunión</th><th>Fecha asistencia</th><th>Convoca</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in data" :key="a.id">
              <td>{{ a.reunion?.nombre }}</td>
              <td>{{ formatDate(a.fecha_hora) }}</td>
              <td>{{ a.reunion?.entidad_convocante }}</td>
              <td>
                <button class="button" @click="descargarCert(a.reunion?.id)">Descargar PDF</button>
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
const certificados = ref([]);
const certMap = computed(() => {
  const map = {};
  certificados.value.forEach((c) => {
    if (c.reunion?.id) map[c.reunion.id] = c.url_pdf;
  });
  return map;
});
const from = ref('');
const to = ref('');
const search = ref('');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const loading = ref(false);
const docenteId = ref(null);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value || 1)));
const router = useRouter();
const auth = useAuthStore();

const formatDate = (value) => {
  if (!value) return '';
  return `${value}`.split('T')[0];
};

const load = async () => {
  loading.value = true;
  if (!docenteId.value) {
    const { data: me } = await api.get('/docentes/me');
    docenteId.value = me.id;
  }
  const { data: res } = await api.get('/asistencias/mias', { params: { from: from.value || undefined, to: to.value || undefined, search: search.value || undefined, page: page.value, limit: limit.value } });
  data.value = res.data;
  total.value = res.total || 0;
  await loadCertificados();
  loading.value = false;
};

const loadCertificados = async () => {
  if (!docenteId.value) return;
  const { data: res } = await api.get(`/certificados/docentes/${docenteId.value}`, { params: { from: from.value || undefined, to: to.value || undefined, search: search.value || undefined, limit: 500 } });
  certificados.value = res.data || [];
};

const filtrar = () => {
  page.value = 1;
  load();
};

const limpiar = () => {
  from.value = '';
  to.value = '';
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
  if (page.value >= totalPages.value) return;
  page.value += 1;
  load();
};

const logout = () => {
  auth.logout();
  router.push('/login');
};

const descargarCert = async (reunionId) => {
  const url = certMap.value[reunionId];
  if (url) {
    window.open(url, '_blank');
    return;
  }
  if (!docenteId.value) return alert('No se pudo identificar al docente');
  try {
    const response = await api.get(`/certificados/docentes/${docenteId.value}/reuniones/${reunionId}/pdf`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `certificado-${reunionId}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (e) {
    alert(e.response?.data?.message || 'No se pudo descargar el certificado');
  }
};

onMounted(load);
</script>
