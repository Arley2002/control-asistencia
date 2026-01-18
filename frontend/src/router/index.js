import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const Login = () => import('../views/Login.vue');
const AdminDashboard = () => import('../views/admin/AdminDashboard.vue');
const Docentes = () => import('../views/admin/Docentes.vue');
const Reuniones = () => import('../views/admin/Reuniones.vue');
const Usuarios = () => import('../views/admin/Usuarios.vue');
const Certificados = () => import('../views/admin/Certificados.vue');
const SecretarioReuniones = () => import('../views/secretario/Reuniones.vue');
const DocenteAsistencias = () => import('../views/docente/MisAsistencias.vue');
const DocentePerfil = () => import('../views/docente/Perfil.vue');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/', redirect: '/login' },
    {
      path: '/admin',
      meta: { requiresAuth: true, roles: ['administrador'] },
      children: [
        { path: 'dashboard', component: AdminDashboard },
        { path: 'docentes', component: Docentes },
        { path: 'reuniones', component: Reuniones },
        { path: 'usuarios', component: Usuarios },
        { path: 'certificados', component: Certificados }
      ]
    },
    {
      path: '/secretario',
      meta: { requiresAuth: true, roles: ['secretario'] },
      children: [
        { path: 'reuniones', component: SecretarioReuniones }
      ]
    },
    {
      path: '/docente',
      meta: { requiresAuth: true, roles: ['docente'] },
      children: [
        { path: 'mis-asistencias', component: DocenteAsistencias },
        { path: 'perfil', component: DocentePerfil }
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/login' }
  ]
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) return next('/login');
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.rol)) return next('/login');
  next();
});

export default router;
