<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h2 class="title">Ingreso al sistema</h2>
      <p class="subtitle">Ingrese con su número de cédula</p>

      <form @submit.prevent="onSubmit" class="form">
        <div class="field">
          <label for="username">Usuario</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="usuario"
            required
            autofocus
          />
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Contraseña"
            required
          />
        </div>

        <button class="btn-primary" type="submit" :disabled="loading">
          <span v-if="!loading">Entrar</span>
          <span v-else class="spinner"></span>
        </button>
      </form>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const onSubmit = async () => {
  error.value = ''
  loading.value = true

  try {
    await auth.login(username.value, password.value)

    const rol = auth.user?.rol
    if (rol === 'administrador') router.push('/admin/dashboard')
    else if (rol === 'secretario') router.push('/secretario/reuniones')
    else router.push('/docente/perfil')
  } catch (e) {
    error.value = 'Credenciales inválidas'
  } finally {
    loading.value = false
  }
}
</script>
