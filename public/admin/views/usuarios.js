// public/admin/views/usuarios.js
import { api } from "../../assets/js/api.js";

export async function renderAdminUsers({ root }) {
  let usuarios = [];
  let carreras = [];
  let filteredUsuarios = [];
  let currentEditingUser = null;

  // HTML de la vista
  root.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <h2 class="admin-section-title">Gestión de Usuarios</h2>
        <button class="btn btn-admin-primary" id="add-user-btn">
          👥 Nuevo Usuario
        </button>
      </div>

      <div class="admin-controls">
        <div class="admin-filters">
          <input type="text" class="admin-search" id="search-usuarios" placeholder="Buscar por nombre o email...">
          <select class="admin-select" id="filter-rol">
            <option value="">Todos los roles</option>
            <option value="ADMIN">Administradores</option>
            <option value="COORDINADOR">Coordinadores</option>
            <option value="ALUMNO">Alumnos</option>
          </select>
          <select class="admin-select" id="filter-carrera">
            <option value="">Todas las carreras</option>
          </select>
        </div>
        <div>
          <button class="btn btn-outline" id="refresh-usuarios">🔄 Actualizar</button>
          <button class="btn btn-outline" id="export-usuarios" disabled>📊 Exportar</button>
        </div>
      </div>

      <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Carrera</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="usuarios-table-body">
            <tr>
              <td colspan="6" style="text-align: center; padding: 2rem; color: var(--muted);">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                Cargando usuarios...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div id="usuarios-stats" style="margin-top: 1rem; color: var(--muted); font-size: 0.9rem;">
        <!-- Estadísticas se cargan aquí -->
      </div>
    </div>

    <!-- Modal para agregar/editar usuario -->
    <div id="user-modal" class="modal-overlay hidden admin-modal">
      <div class="modal">
        <header>
          <h3 id="user-modal-title">Nuevo Usuario</h3>
        </header>
        <div class="content">
          <form id="user-form">
            <div class="form-grid">
              <div class="admin-form-group">
                <label for="user-email">Email Institucional</label>
                <input type="email" id="user-email" required placeholder="ejemplo@itcelaya.mx">
                <div class="form-help-text">Debe ser un email válido del dominio institucional</div>
              </div>
              <div class="admin-form-group">
                <label for="user-nombre">Nombre Completo</label>
                <input type="text" id="user-nombre" required placeholder="Juan Pérez García">
              </div>
            </div>
            
            <div class="form-grid">
              <div class="admin-form-group">
                <label for="user-rol">Rol del Usuario</label>
                <select id="user-rol" required>
                  <option value="">Seleccionar rol...</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="COORDINADOR">Coordinador</option>
                  <option value="ALUMNO">Alumno</option>
                </select>
              </div>
              <div class="admin-form-group" id="carrera-group" style="display: none;">
                <label for="user-carrera">Carrera Asignada</label>
                <select id="user-carrera">
                  <option value="">Sin asignar</option>
                </select>
                <div class="form-help-text">Solo para coordinadores</div>
              </div>
            </div>

            <div id="temp-password-info" class="form-msg success" style="display: none; margin-top: 1rem;">
              <!-- Se muestra después de crear el usuario -->
            </div>
          </form>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-outline" id="user-modal-cancel">Cancelar</button>
          <button type="submit" class="btn btn-admin-primary" id="user-modal-save" form="user-form">
            <span id="save-text">Guardar Usuario</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Referencias a elementos
  const searchInput = root.querySelector("#search-usuarios");
  const filterRol = root.querySelector("#filter-rol");
  const filterCarrera = root.querySelector("#filter-carrera");
  const usuariosTableBody = root.querySelector("#usuarios-table-body");
  const usuariosStats = root.querySelector("#usuarios-stats");
  const refreshBtn = root.querySelector("#refresh-usuarios");
  const addUserBtn = root.querySelector("#add-user-btn");
  
  // Modal elements
  const userModal = root.querySelector("#user-modal");
  const userModalTitle = root.querySelector("#user-modal-title");
  const userForm = root.querySelector("#user-form");
  const userModalCancel = root.querySelector("#user-modal-cancel");
  const carreraGroup = root.querySelector("#carrera-group");
  const userRolSelect = root.querySelector("#user-rol");
  const userCarreraSelect = root.querySelector("#user-carrera");

  // Funciones principales
  async function loadUsuarios() {
    try {
      usuariosTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem;">
            <div class="spinner" style="margin: 0 auto 1rem;"></div>
            Cargando usuarios...
          </td>
        </tr>
      `;

      const [usuariosData, carrerasData] = await Promise.all([
        api("/api/admin/usuarios"),
        api("/api/admin/carreras")
      ]);

      usuarios = usuariosData;
      carreras = carrerasData;

      // Poblar filtro de carreras
      filterCarrera.innerHTML = '<option value="">Todas las carreras</option>' +
        carreras.map(c => `<option value="${c.id_carrera}">${c.id_carrera} - ${c.nom_carrera}</option>`).join('');

      // Poblar select de carreras en modal
      userCarreraSelect.innerHTML = '<option value="">Sin asignar</option>' +
        carreras.map(c => `<option value="${c.id_carrera}">${c.id_carrera} - ${c.nom_carrera}</option>`).join('');

      filterUsuarios();
      updateStats();

    } catch (error) {
      console.error("Error cargando usuarios:", error);
      usuariosTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--danger);">
            Error al cargar usuarios: ${error.message}
          </td>
        </tr>
      `;
    }
  }

  function filterUsuarios() {
    const searchTerm = searchInput.value.toLowerCase();
    const rolFilter = filterRol.value;
    const carreraFilter = filterCarrera.value;

    filteredUsuarios = usuarios.filter(usuario => {
      const matchesSearch = 
        usuario.nombre.toLowerCase().includes(searchTerm) ||
        usuario.email.toLowerCase().includes(searchTerm);
      
      const matchesRol = !rolFilter || usuario.rol_clave === rolFilter;
      const matchesCarrera = !carreraFilter || usuario.carrera_id === carreraFilter;

      return matchesSearch && matchesRol && matchesCarrera;
    });

    renderUsuariosTable();
    updateStats();
  }

  function renderUsuariosTable() {
    if (filteredUsuarios.length === 0) {
      usuariosTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--muted);">
            No se encontraron usuarios con los filtros aplicados
          </td>
        </tr>
      `;
      return;
    }

    usuariosTableBody.innerHTML = filteredUsuarios.map(usuario => {
      const getRoleBadge = (rol) => {
        const classes = {
          'ADMIN': 'role-admin',
          'COORDINADOR': 'role-coordinador',
          'ALUMNO': 'role-alumno'
        };
        return `<span class="role-badge ${classes[rol] || ''}">${rol}</span>`;
      };

      const getStatusIndicator = () => {
        // Simulación de estado - después conectar con lógica real
        return `<span class="status-indicator status-active"></span>Activo`;
      };

      return `
        <tr data-user-id="${usuario.id_usuario}">
          <td>${usuario.email}</td>
          <td>${usuario.nombre}</td>
          <td>${getRoleBadge(usuario.rol_clave)}</td>
          <td>${usuario.nom_carrera || '-'}</td>
          <td>${getStatusIndicator()}</td>
          <td>
            <div style="display: flex; gap: 0.25rem;">
              <button class="btn btn-outline btn-small" 
                      onclick="editUser(${usuario.id_usuario})" 
                      title="Editar usuario">
                ✏️
              </button>
              <button class="btn btn-outline btn-small" 
                      onclick="resetUserPassword(${usuario.id_usuario})" 
                      title="Resetear contraseña">
                🔑
              </button>
              ${usuario.rol_clave !== 'ADMIN' ? `
                <button class="btn btn-danger btn-small" 
                        onclick="deleteUser(${usuario.id_usuario})" 
                        title="Eliminar usuario">
                  🗑️
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function updateStats() {
    const stats = {
      total: filteredUsuarios.length,
      admins: filteredUsuarios.filter(u => u.rol_clave === 'ADMIN').length,
      coordinadores: filteredUsuarios.filter(u => u.rol_clave === 'COORDINADOR').length,
      alumnos: filteredUsuarios.filter(u => u.rol_clave === 'ALUMNO').length
    };

    usuariosStats.innerHTML = `
      Mostrando ${stats.total} usuarios: 
      ${stats.admins} administradores, 
      ${stats.coordinadores} coordinadores, 
      ${stats.alumnos} alumnos
    `;
  }

  function openUserModal(userId = null) {
    currentEditingUser = userId;
    
    if (userId) {
      const user = usuarios.find(u => u.id_usuario == userId);
      userModalTitle.textContent = "Editar Usuario";
      document.getElementById('user-email').value = user.email;
      document.getElementById('user-nombre').value = user.nombre;
      document.getElementById('user-rol').value = user.rol_clave;
      document.getElementById('user-carrera').value = user.carrera_id || '';
      
      // Mostrar/ocultar campo de carrera
      carreraGroup.style.display = user.rol_clave === 'COORDINADOR' ? 'block' : 'none';
      
    } else {
      userModalTitle.textContent = "Nuevo Usuario";
      userForm.reset();
      carreraGroup.style.display = 'none';
    }

    // Limpiar mensaje de contraseña temporal
    document.getElementById('temp-password-info').style.display = 'none';
    
    userModal.classList.remove('hidden');
  }

  function closeUserModal() {
    userModal.classList.add('hidden');
    currentEditingUser = null;
  }

  async function saveUser() {
    const formData = new FormData(userForm);
    const userData = {
      email: formData.get('user-email') || document.getElementById('user-email').value,
      nombre: formData.get('user-nombre') || document.getElementById('user-nombre').value,
      rol_clave: document.getElementById('user-rol').value,
      carrera_id: document.getElementById('user-carrera').value || null
    };

    const saveBtn = document.getElementById('user-modal-save');
    const saveText = document.getElementById('save-text');
    const originalText = saveText.textContent;

    try {
      saveBtn.disabled = true;
      saveText.textContent = 'Guardando...';

      if (currentEditingUser) {
        await api(`/api/admin/usuarios/${currentEditingUser}`, {
          method: 'PUT',
          body: userData
        });
      } else {
        const response = await api('/api/admin/usuarios', {
          method: 'POST',
          body: userData
        });

        // Mostrar contraseña temporal
        if (response.temp_password) {
          const tempPasswordInfo = document.getElementById('temp-password-info');
          tempPasswordInfo.innerHTML = `
            <strong>Usuario creado exitosamente</strong><br>
            Contraseña temporal: <code style="background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold;">${response.temp_password}</code><br>
            <small>Comparte esta contraseña de forma segura con el usuario.</small>
          `;
          tempPasswordInfo.style.display = 'block';
          
          // No cerrar el modal aún para que vean la contraseña
          await loadUsuarios();
          return;
        }
      }

      closeUserModal();
      await loadUsuarios();

    } catch (error) {
      console.error('Error guardando usuario:', error);
      alert(`Error: ${error.message}`);
    } finally {
      saveBtn.disabled = false;
      saveText.textContent = originalText;
    }
  }

  // Funciones globales para eventos
  window.editUser = (userId) => openUserModal(userId);

  window.deleteUser = async (userId) => {
    const user = usuarios.find(u => u.id_usuario == userId);
    
    window.openConfirmModal({
      title: "Eliminar Usuario",
      content: `
        <p>¿Estás seguro de eliminar al usuario <strong>${user.nombre}</strong>?</p>
        <p>Esta acción no se puede deshacer y se eliminarán todos los datos relacionados.</p>
      `,
      onConfirm: async () => {
        try {
          await api(`/api/admin/usuarios/${userId}`, { method: 'DELETE' });
          await loadUsuarios();
        } catch (error) {
          alert(`Error eliminando usuario: ${error.message}`);
        }
      }
    });
  };

  window.resetUserPassword = async (userId) => {
    const user = usuarios.find(u => u.id_usuario == userId);
    
    window.openConfirmModal({
      title: "Resetear Contraseña",
      content: `
        <p>¿Generar nueva contraseña temporal para <strong>${user.nombre}</strong>?</p>
        <p>La contraseña actual quedará inválida inmediatamente.</p>
      `,
      okText: "Generar",
      okVariant: "primary",
      onConfirm: async () => {
        try {
          const response = await api(`/api/admin/usuarios/${userId}/reset-password`, { 
            method: 'POST' 
          });
          
          if (response.temp_password) {
            alert(`Nueva contraseña temporal para ${user.email}:\n\n${response.temp_password}\n\nCompártela de forma segura.`);
          }
        } catch (error) {
          alert(`Error reseteando contraseña: ${error.message}`);
        }
      }
    });
  };

  // Event Listeners
  searchInput.addEventListener('input', filterUsuarios);
  filterRol.addEventListener('change', filterUsuarios);
  filterCarrera.addEventListener('change', filterUsuarios);
  refreshBtn.addEventListener('click', loadUsuarios);
  addUserBtn.addEventListener('click', () => openUserModal());
  
  userModalCancel.addEventListener('click', closeUserModal);
  userModal.addEventListener('click', (e) => {
    if (e.target === userModal) closeUserModal();
  });

  // Mostrar campo de carrera solo para coordinadores
  userRolSelect.addEventListener('change', function() {
    carreraGroup.style.display = this.value === 'COORDINADOR' ? 'block' : 'none';
  });

  // Manejar envío del formulario
  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveUser();
  });

  // Inicialización
  await loadUsuarios();
}