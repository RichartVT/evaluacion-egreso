// public/admin/views/estudiantes.js
import { api } from "../../assets/js/api.js";

export async function renderAdminEstudiantes({ root }) {
  let estudiantes = [];
  let carreras = [];
  let filteredEstudiantes = [];
  let currentEditingStudent = null;

  // HTML de la vista
  root.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <h2 class="admin-section-title">Gestión de Estudiantes</h2>
        <div>
          <button class="btn btn-admin-primary" id="import-students-btn">
            📁 Importar Masivo
          </button>
          <button class="btn btn-outline" id="add-student-btn">
            👨‍🎓 Nuevo Estudiante
          </button>
        </div>
      </div>

      <!-- Estadísticas rápidas -->
      <div class="dashboard-stats" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 2rem;">
        <div class="stat-card">
          <div class="stat-number" id="total-estudiantes">-</div>
          <div class="stat-label">Total Estudiantes</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="con-cuenta">-</div>
          <div class="stat-label">Con Cuenta Activa</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="sin-cuenta">-</div>
          <div class="stat-label">Sin Cuenta</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="con-evaluaciones">-</div>
          <div class="stat-label">Con Evaluaciones</div>
        </div>
      </div>

      <div class="admin-controls">
        <div class="admin-filters">
          <input type="text" class="admin-search" id="search-estudiantes" placeholder="Buscar por control, nombre o email...">
          <select class="admin-select" id="filter-carrera">
            <option value="">Todas las carreras</option>
          </select>
          <select class="admin-select" id="filter-estado">
            <option value="">Todos los estados</option>
            <option value="true">Con cuenta activa</option>
            <option value="false">Sin cuenta</option>
          </select>
        </div>
        <div>
          <button class="btn btn-outline" id="refresh-estudiantes">🔄 Actualizar</button>
          <button class="btn btn-outline" id="export-estudiantes" disabled>📊 Exportar</button>
        </div>
      </div>

      <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);">
        <table class="admin-table">
          <thead>
            <tr>
              <th>No. Control</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Evaluaciones</th>
              <th>Última Actividad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="estudiantes-table-body">
            <tr>
              <td colspan="7" style="text-align: center; padding: 2rem; color: var(--muted);">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                Cargando estudiantes...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div id="estudiantes-stats" style="margin-top: 1rem; color: var(--muted); font-size: 0.9rem;">
        <!-- Estadísticas se cargan aquí -->
      </div>
    </div>

    <!-- Modal para agregar estudiante individual -->
    <div id="student-modal" class="modal-overlay hidden admin-modal">
      <div class="modal">
        <header>
          <h3 id="student-modal-title">Nuevo Estudiante</h3>
        </header>
        <div class="content">
          <form id="student-form">
            <div class="form-grid">
              <div class="admin-form-group">
                <label for="student-control">Número de Control</label>
                <input type="text" id="student-control" required placeholder="241260042" maxlength="9" pattern="[0-9]{8,9}">
                <div class="form-help-text">8 o 9 dígitos según formato TecNM</div>
              </div>
              <div class="admin-form-group">
                <label for="student-nombre">Nombre Completo</label>
                <input type="text" id="student-nombre" required placeholder="Juan Pérez García">
              </div>
            </div>
            
            <div class="admin-form-group">
              <label for="student-email">Email (opcional)</label>
              <input type="email" id="student-email" placeholder="Se generará automáticamente si no se especifica">
              <div class="form-help-text">Si se deja vacío, se generará: [control]@itcelaya.edu.mx</div>
            </div>

            <div id="temp-password-info" class="form-msg success" style="display: none; margin-top: 1rem;">
              <!-- Se muestra después de crear el estudiante -->
            </div>
          </form>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-outline" id="student-modal-cancel">Cancelar</button>
          <button type="submit" class="btn btn-admin-primary" id="student-modal-save" form="student-form">
            <span id="student-save-text">Crear Estudiante</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal para importación masiva -->
    <div id="import-modal" class="modal-overlay hidden admin-modal">
      <div class="modal" style="max-width: 800px;">
        <header>
          <h3>Importación Masiva de Estudiantes</h3>
        </header>
        <div class="content">
          <div style="margin-bottom: 1.5rem;">
            <h4>Formato requerido (CSV/Excel):</h4>
            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; font-family: monospace; font-size: 0.9rem;">
              id_estudiante,nombre,email<br>
              241260042,Juan Pérez García,juan.perez@email.com<br>
              241260043,María López Silva,<br>
              <em style="color: var(--muted);">Nota: El email es opcional. Si no se especifica, se genera automáticamente.</em>
            </div>
          </div>

          <div class="import-zone" id="import-dropzone">
            <div style="text-align: center; padding: 2rem;">
              <div style="font-size: 3rem; margin-bottom: 1rem;">📁</div>
              <h4>Arrastra tu archivo aquí o haz clic para seleccionar</h4>
              <p style="color: var(--muted);">Acepta archivos CSV y Excel (.xlsx, .xls)</p>
              <input type="file" id="import-file" accept=".csv,.xlsx,.xls" style="display: none;">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('import-file').click()">
                Seleccionar Archivo
              </button>
            </div>
          </div>

          <div id="import-preview" style="display: none; margin-top: 1.5rem;">
            <h4>Vista Previa (<span id="preview-count">0</span> registros)</h4>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px;">
              <table class="admin-table" style="margin: 0;">
                <thead>
                  <tr>
                    <th>Control</th>
                    <th>Nombre</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody id="preview-tbody">
                </tbody>
              </table>
            </div>
          </div>

          <div id="import-results" style="display: none; margin-top: 1.5rem;">
            <!-- Resultados de importación -->
          </div>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-outline" id="import-modal-cancel">Cancelar</button>
          <button type="button" class="btn btn-admin-primary" id="import-execute" style="display: none;">
            <span id="import-text">Importar Estudiantes</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de detalle de estudiante -->
    <div id="detail-modal" class="modal-overlay hidden admin-modal">
      <div class="modal">
        <header>
          <h3 id="detail-modal-title">Detalles del Estudiante</h3>
        </header>
        <div class="content" id="detail-modal-content">
          <!-- Contenido se carga dinámicamente -->
        </div>
        <div class="actions">
          <button type="button" class="btn btn-outline" id="detail-modal-close">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  // Referencias a elementos
  const searchInput = root.querySelector("#search-estudiantes");
  const filterCarrera = root.querySelector("#filter-carrera");
  const filterEstado = root.querySelector("#filter-estado");
  const estudiantesTableBody = root.querySelector("#estudiantes-table-body");
  const estudiantesStats = root.querySelector("#estudiantes-stats");
  const refreshBtn = root.querySelector("#refresh-estudiantes");
  const addStudentBtn = root.querySelector("#add-student-btn");
  const importStudentsBtn = root.querySelector("#import-students-btn");
  
  // Modal elements
  const studentModal = root.querySelector("#student-modal");
  const studentModalCancel = root.querySelector("#student-modal-cancel");
  const studentForm = root.querySelector("#student-form");
  const importModal = root.querySelector("#import-modal");
  const importModalCancel = root.querySelector("#import-modal-cancel");
  const detailModal = root.querySelector("#detail-modal");
  const detailModalClose = root.querySelector("#detail-modal-close");

  // Variables para importación
  let importData = [];

  // Funciones principales
  async function loadEstudiantes() {
    try {
      estudiantesTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem;">
            <div class="spinner" style="margin: 0 auto 1rem;"></div>
            Cargando estudiantes...
          </td>
        </tr>
      `;

      const [estudiantesData, carrerasData, statsData] = await Promise.all([
        api("/api/admin/estudiantes"),
        api("/api/carreras"),
        api("/api/admin/estudiantes/stats")
      ]);

      estudiantes = estudiantesData;
      carreras = carrerasData;

      // Actualizar estadísticas
      updateDashboardStats(statsData);

      // Poblar filtro de carreras
      filterCarrera.innerHTML = '<option value="">Todas las carreras</option>' +
        carreras.map(c => `<option value="${c.id_carrera}">${c.id_carrera} - ${c.nom_carrera}</option>`).join('');

      filterEstudiantes();

    } catch (error) {
      console.error("Error cargando estudiantes:", error);
      estudiantesTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--danger);">
            Error al cargar estudiantes: ${error.message}
          </td>
        </tr>
      `;
    }
  }

  function updateDashboardStats(stats) {
    document.getElementById('total-estudiantes').textContent = stats.total_estudiantes || 0;
    document.getElementById('con-cuenta').textContent = stats.con_cuenta || 0;
    document.getElementById('sin-cuenta').textContent = stats.sin_cuenta || 0;
    document.getElementById('con-evaluaciones').textContent = stats.con_evaluaciones || 0;
  }

  function filterEstudiantes() {
    const searchTerm = searchInput.value.toLowerCase();
    const carreraFilter = filterCarrera.value;
    const estadoFilter = filterEstado.value;

    filteredEstudiantes = estudiantes.filter(estudiante => {
      const matchesSearch = 
        estudiante.nombre.toLowerCase().includes(searchTerm) ||
        estudiante.id_estudiante.toLowerCase().includes(searchTerm) ||
        (estudiante.email && estudiante.email.toLowerCase().includes(searchTerm));
      
      const matchesCarrera = !carreraFilter; // Por ahora no filtramos por carrera ya que requiere join complejo
      
      const matchesEstado = !estadoFilter || 
        (estadoFilter === 'true' && estudiante.estado === 'Activo') ||
        (estadoFilter === 'false' && estudiante.estado === 'Inactivo');

      return matchesSearch && matchesCarrera && matchesEstado;
    });

    renderEstudiantesTable();
    updateTableStats();
  }

  function renderEstudiantesTable() {
    if (filteredEstudiantes.length === 0) {
      estudiantesTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--muted);">
            No se encontraron estudiantes con los filtros aplicados
          </td>
        </tr>
      `;
      return;
    }

    estudiantesTableBody.innerHTML = filteredEstudiantes.map(estudiante => {
      const getStatusBadge = (estado) => {
        const classes = {
          'Activo': 'status-active',
          'Inactivo': 'status-inactive'
        };
        return `<span class="status-indicator ${classes[estado] || 'status-pending'}">${estado}</span>`;
      };

      const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-MX');
      };

      return `
        <tr data-student-id="${estudiante.id_estudiante}">
          <td><strong style="color: var(--admin-primary);">${estudiante.id_estudiante}</strong></td>
          <td>${estudiante.nombre}</td>
          <td>${estudiante.email || '-'}</td>
          <td>${getStatusBadge(estudiante.estado)}</td>
          <td style="text-align: center;">${estudiante.evaluaciones_completadas || 0}</td>
          <td style="text-align: center;">${formatDate(estudiante.ultima_actividad)}</td>
          <td>
            <div style="display: flex; gap: 0.25rem;">
              <button class="btn btn-outline btn-small" 
                      onclick="viewStudentDetail('${estudiante.id_estudiante}')" 
                      title="Ver detalles">
                👁️
              </button>
              <button class="btn btn-outline btn-small" 
                      onclick="editStudent('${estudiante.id_estudiante}')" 
                      title="Editar">
                ✏️
              </button>
              ${estudiante.estado === 'Activo' ? `
                <button class="btn btn-outline btn-small" 
                        onclick="resetStudentPassword('${estudiante.id_estudiante}')" 
                        title="Reset contraseña">
                  🔑
                </button>
              ` : ''}
              <button class="btn btn-danger btn-small" 
                      onclick="deleteStudent('${estudiante.id_estudiante}')" 
                      title="Eliminar">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function updateTableStats() {
    const total = filteredEstudiantes.length;
    const activos = filteredEstudiantes.filter(e => e.estado === 'Activo').length;
    const inactivos = total - activos;

    estudiantesStats.innerHTML = `
      Mostrando ${total} estudiantes: ${activos} con cuenta activa, ${inactivos} sin cuenta
    `;
  }

  // Funciones de modales
  function openStudentModal(studentId = null) {
    currentEditingStudent = studentId;
    
    if (studentId) {
      const student = estudiantes.find(e => e.id_estudiante === studentId);
      document.getElementById('student-modal-title').textContent = "Editar Estudiante";
      document.getElementById('student-control').value = student.id_estudiante;
      document.getElementById('student-control').disabled = true;
      document.getElementById('student-nombre').value = student.nombre;
      document.getElementById('student-email').value = student.email || '';
    } else {
      document.getElementById('student-modal-title').textContent = "Nuevo Estudiante";
      studentForm.reset();
      document.getElementById('student-control').disabled = false;
    }

    document.getElementById('temp-password-info').style.display = 'none';
    studentModal.classList.remove('hidden');
  }

  function closeStudentModal() {
    studentModal.classList.add('hidden');
    currentEditingStudent = null;
  }

  async function saveStudent() {
    const studentData = {
      id_estudiante: document.getElementById('student-control').value.trim(),
      nombre: document.getElementById('student-nombre').value.trim(),
      email: document.getElementById('student-email').value.trim() || null
    };

    const saveBtn = document.getElementById('student-modal-save');
    const saveText = document.getElementById('student-save-text');
    const originalText = saveText.textContent;

    try {
      saveBtn.disabled = true;
      saveText.textContent = 'Guardando...';

      if (currentEditingStudent) {
        await api(`/api/admin/estudiantes/${currentEditingStudent}`, {
          method: 'PUT',
          body: { nombre: studentData.nombre }
        });
      } else {
        const response = await api('/api/admin/estudiantes', {
          method: 'POST',
          body: studentData
        });

        if (response.temp_password) {
          const tempPasswordInfo = document.getElementById('temp-password-info');
          tempPasswordInfo.innerHTML = `
            <strong>Estudiante creado exitosamente</strong><br>
            Email: <code>${response.email}</code><br>
            Contraseña temporal: <code style="background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold;">${response.temp_password}</code><br>
            <small>Comparte esta información de forma segura con el estudiante.</small>
          `;
          tempPasswordInfo.style.display = 'block';
          await loadEstudiantes();
          return;
        }
      }

      closeStudentModal();
      await loadEstudiantes();

    } catch (error) {
      console.error('Error guardando estudiante:', error);
      alert(`Error: ${error.message}`);
    } finally {
      saveBtn.disabled = false;
      saveText.textContent = originalText;
    }
  }

  // Funciones globales para eventos
  window.editStudent = (studentId) => openStudentModal(studentId);

  window.deleteStudent = async (studentId) => {
    const student = estudiantes.find(e => e.id_estudiante === studentId);
    
    try {
      await api(`/api/admin/estudiantes/${studentId}`, { method: 'DELETE' });
      await loadEstudiantes();
    } catch (error) {
      if (error.status === 409 && error.data?.code === "DEPENDENCIES_FOUND") {
        const counts = error.data.counts;
        window.openConfirmModal({
          title: "Eliminar Estudiante con Evaluaciones",
          content: `
            <p>El estudiante <strong>${student.nombre}</strong> tiene datos registrados:</p>
            <ul style="margin: 0.5rem 0 1rem 1.5rem;">
              <li><strong>${counts.respuestas}</strong> respuestas de evaluaciones</li>
            </ul>
            <p>Si continúas, se eliminarán <strong>también</strong> todas sus evaluaciones. Esta acción es irreversible.</p>
          `,
          okText: "Eliminar Todo",
          onConfirm: async () => {
            try {
              await api(`/api/admin/estudiantes/${studentId}?force=1`, { method: 'DELETE' });
              await loadEstudiantes();
            } catch (error) {
              alert(`Error eliminando estudiante: ${error.message}`);
            }
          }
        });
      } else {
        alert(`Error eliminando estudiante: ${error.message}`);
      }
    }
  };

  window.resetStudentPassword = async (studentId) => {
    const student = estudiantes.find(e => e.id_estudiante === studentId);
    
    window.openConfirmModal({
      title: "Resetear Contraseña",
      content: `
        <p>¿Generar nueva contraseña temporal para <strong>${student.nombre}</strong>?</p>
        <p>La contraseña actual quedará inválida inmediatamente.</p>
      `,
      okText: "Generar",
      okVariant: "primary",
      onConfirm: async () => {
        try {
          const response = await api(`/api/admin/estudiantes/${studentId}/reset-password`, { 
            method: 'POST' 
          });
          
          if (response.temp_password) {
            alert(`Nueva contraseña temporal para ${student.nombre}:\n\nEmail: ${response.email}\nContraseña: ${response.temp_password}\n\nCompártela de forma segura.`);
          }
        } catch (error) {
          alert(`Error reseteando contraseña: ${error.message}`);
        }
      }
    });
  };

  window.viewStudentDetail = async (studentId) => {
    try {
      const detail = await api(`/api/admin/estudiantes/${studentId}`);
      const { estudiante, evaluaciones } = detail;
      
      document.getElementById('detail-modal-title').textContent = `${estudiante.nombre} (${estudiante.id_estudiante})`;
      
      document.getElementById('detail-modal-content').innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
          <div>
            <h4 style="margin: 0 0 1rem 0;">Información Personal</h4>
            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
              <p><strong>Control:</strong> ${estudiante.id_estudiante}</p>
              <p><strong>Nombre:</strong> ${estudiante.nombre}</p>
              <p><strong>Email:</strong> ${estudiante.email || 'No asignado'}</p>
              <p><strong>Estado:</strong> ${estudiante.id_usuario ? 'Con cuenta activa' : 'Sin cuenta'}</p>
            </div>
          </div>
          <div>
            <h4 style="margin: 0 0 1rem 0;">Estadísticas</h4>
            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
              <p><strong>Carreras evaluadas:</strong> ${evaluaciones.length}</p>
              <p><strong>Total evaluaciones:</strong> ${evaluaciones.reduce((sum, e) => sum + e.materias_evaluadas, 0)}</p>
              <p><strong>Último período:</strong> ${evaluaciones.length > 0 ? Math.max(...evaluaciones.map(e => e.ultimo_periodo)) : 'N/A'}</p>
            </div>
          </div>
        </div>
        
        ${evaluaciones.length > 0 ? `
          <h4 style="margin: 0 0 1rem 0;">Evaluaciones por Carrera</h4>
          <table class="admin-table">
            <thead>
              <tr><th>Carrera</th><th>Materias Evaluadas</th><th>Períodos</th><th>Último Período</th></tr>
            </thead>
            <tbody>
              ${evaluaciones.map(e => `
                <tr>
                  <td>${e.id_carrera} - ${e.nom_carrera}</td>
                  <td style="text-align: center;">${e.materias_evaluadas}</td>
                  <td style="text-align: center;">${e.periodos}</td>
                  <td style="text-align: center;">${e.ultimo_periodo}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="text-align: center; color: var(--muted); padding: 2rem;">No hay evaluaciones registradas</p>'}
      `;
      
      detailModal.classList.remove('hidden');
    } catch (error) {
      alert(`Error cargando detalles: ${error.message}`);
    }
  };

  // Event Listeners principales
  searchInput.addEventListener('input', filterEstudiantes);
  filterCarrera.addEventListener('change', filterEstudiantes);
  filterEstado.addEventListener('change', filterEstudiantes);
  refreshBtn.addEventListener('click', loadEstudiantes);
  addStudentBtn.addEventListener('click', () => openStudentModal());
  importStudentsBtn.addEventListener('click', () => importModal.classList.remove('hidden'));
  
  studentModalCancel.addEventListener('click', closeStudentModal);
  importModalCancel.addEventListener('click', () => importModal.classList.add('hidden'));
  detailModalClose.addEventListener('click', () => detailModal.classList.add('hidden'));
  
  studentModal.addEventListener('click', (e) => {
    if (e.target === studentModal) closeStudentModal();
  });

  studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveStudent();
  });

  // Validación de número de control
  document.getElementById('student-control').addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9]/g, '');
  });

  // Inicialización
  await loadEstudiantes();
}