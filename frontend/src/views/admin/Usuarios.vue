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
      <h1>Usuarios</h1>
      <div class="card">
        <h3>{{ form.id ? 'Editar usuario' : 'Crear usuario' }}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.5rem;">
          <input v-model="form.nombre" placeholder="Nombre" />
          <input v-model="form.correo" placeholder="Correo" />
          <input v-model="form.username" placeholder="Usuario" />
          <input type="password" v-model="form.password" placeholder="Contraseña" />
          <select v-model="form.rol_id">
            <option value="1">administrador</option>
            <option value="2">secretario</option>
            <option value="3">docente</option>
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
      <div class="card">
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
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/http.js';
import { useAuthStore } from '../../stores/auth.js';

const data = ref([]);
const form = ref({ id: null, nombre: '', correo: '', username: '', password: '', rol_id: 2, estado: 'activo' });
const error = ref('');
const ok = ref('');
const router = useRouter();
const auth = useAuthStore();

const load = async () => {
  const { data: res } = await api.get('/usuarios');
  data.value = res;
};

const resetForm = () => {
  form.value = { id: null, nombre: '', correo: '', username: '', password: '', rol_id: 2, estado: 'activo' };
  error.value = '';
  ok.value = '';
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
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al guardar';
  }
};

const edit = (u) => {
  form.value = { id: u.id, nombre: u.nombre, correo: u.correo, username: u.username, password: '', rol_id: u.rol?.id || 2, estado: u.estado };
  ok.value = '';
  error.value = '';
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

onMounted(load);
</script>
