<template>
  <div class="layout">
    <aside class="sidebar">
      <p>Secretario</p>
      <p><router-link to="/secretario/reuniones">Reuniones</router-link></p>
      <p><button class="button" style="width:100%;background:#ef4444" @click="logout">Cerrar sesión</button></p>
    </aside>
    <main class="content">
      <h1>Reuniones visibles</h1>
      <div class="card">
        <p v-if="message" :style="{color: messageType==='error' ? 'red' : 'green'}">{{ message }}</p>
        <table class="table">
          <thead>
            <tr><th>Nombre</th><th>Fecha</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in data" :key="r.id">
              <td>{{ r.nombre }}</td>
              <td>{{ r.fecha }}</td>
              <td>
                <input type="file" accept=".csv" :disabled="uploading" @change="(e) => uploadCsv(r.id, e)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/http.js';
import { useAuthStore } from '../../stores/auth.js';

const data = ref([]);
const uploading = ref(false);
const message = ref('');
const messageType = ref('');
const router = useRouter();
const auth = useAuthStore();

const load = async () => {
  const { data: res } = await api.get('/reuniones');
  data.value = res.data;
};

const uploadCsv = async (reunionId, event) => {
  const file = event.target.files[0];
  if (!file) return;
  message.value = '';
  messageType.value = '';
  const form = new FormData();
  form.append('file', file);
  uploading.value = true;
  try {
    const { data } = await api.post(`/asistencias/reuniones/${reunionId}/csv`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    const errores = data.errores?.length || 0;
    message.value = `Insertados: ${data.insertados || 0}${errores ? ` | Errores: ${errores}` : ' | Sin errores'}`;
    messageType.value = errores ? 'error' : 'success';
  } catch (e) {
    message.value = e.response?.data?.message || 'Error al procesar el archivo';
    messageType.value = 'error';
  } finally {
    uploading.value = false;
    event.target.value = '';
  }
};

const logout = () => {
  auth.logout();
  router.push('/login');
};

onMounted(load);
</script>
