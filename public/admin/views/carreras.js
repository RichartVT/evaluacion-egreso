// public/admin/views/carreras.js
import { api } from "../../assets/js/api.js";

export async function renderAdminCarreras({ root }) {
  let carreras = [];
  let currentEditingCarrera = null;

  // HTML de la vista
  root.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <h2 class="admin-section-title">Gestión de Carreras</h2>
        <button class="btn btn-admin-primary" id="add-carrera-btn">
          🎓 Nueva Carrera
        </button>
      </div>

      <div class="admin-controls">
        <div class="admin-filters">
          <input type="text" class="admin-search" id="search-carreras" placeholder="Buscar carreras...">
          <select class="admin-select" id="filter-coordinador">
            <option value="">Todos</option>
            <option value="con-coordinador">Con coordinador</option>
            <option value="sin-coordinador">Sin coordinador</option>
          </select>
        </div>
        <div>
          <button class="btn btn-outline" id="refresh-carreras">🔄 Actualizar</button>
          <button class="btn btn-outline" id="export-carreras" disabled>📊 Exportar</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;" id="carreras-grid">
        <!-- Tarjetas de carreras se renderizan aquí -->
      </div>

      <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre de la Carrera</th>
              <th>Coordinador</th>
              <th>Materias</th>
              <th>Atributos</th>
              <th>Estudiantes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="carreras-table-body">
            <tr>
              <td colspan="7" style="text-align: center; padding: 2rem; color: var(--muted);">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                Cargando carreras...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal para agregar/editar carrera -->
    <div id="carrera-modal" class="modal-overlay hidden admin-modal">
      <div class="modal">
        <header>
          <h3 id="carrera-modal-title">Nueva Carrera</h3>
        </header>
        <div class="content">
          <form id="carrera-form">
            <div class="admin-form-group">
              <label for="carrera-id">ID de la Carrera</label>
              <input type="text" id="carrera-id" required placeholder="ISC" maxlength="5" style="text-transform: uppercase;">
              <div class="form-help-text">Máximo 5 caracteres, generalmente siglas (ej: ISC, IQ, IMCN)</div>
            </div>
            
            <div class="admin-form-group">
              <label for="carrera-nombre">Nombre Completo</label>
              <input type="text" id="carrera-nombre" required placeholder="Ingeniería en Sistemas Computacionales">
              <div class="form-help-text">Nombre oficial completo de la carrera</div>
            </div>
          </form>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-outline" id="carrera-modal-cancel">Cancelar</button>
          <button type="submit" class="btn btn-admin-primary" id="carrera-modal-save" form="carrera-form">
            <span id="carrera-save-text">Guardar Carrera</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de detalles de carrera -->
    <div id="carrera-details-modal" class="modal-overlay hidden admin-modal">
      <div class="modal">
        <header>
          <h3 id="details-modal-title">Detalles de Carrera</h3>
        </header>
        <div class="content" id="carrera-details-content">
          <!-- Contenido se carga dinámicamente -->
        </div>
        <div class="actions">
          <button type="button" class="btn btn-outline" id="details-modal-close">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  // Referencias a elementos
  const searchInput = root.querySelector("#search-carreras");
  const filterCoordinador = root.querySelector("#filter-coordinador");
  const carrerasGrid = root.querySelector("#carreras-grid");
  const carrerasTableBody = root.querySelector("#carreras-table-body");
  const refreshBtn = root.querySelector("#refresh-carreras");
  const addCarreraBtn = root.querySelector("#add-carrera-btn");
  
  // Modal elements
  const carreraModal = root.querySelector("#carrera-modal");
  const carreraModalTitle = root.querySelector("#carrera-modal-title");
  const carreraForm = root.querySelector("#carrera-form");
  const carreraModalCancel = root.querySelector("#carrera-modal-cancel");
  const detailsModal = root.querySelector("#carrera-details-modal");
  const detailsModalClose = root.querySelector("#details-modal-close");

  // Funciones principales
  async function loadCarreras() {
    try {
      carrerasTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem;">
            <div class="spinner" style="margin: 0 auto 1rem;"></div>
            Cargando carreras...
          </td>
        </tr>
      `;

      const carrerasData = await api("/api/admin/carreras");
      carreras = carrerasData;

      renderCarrerasTable();
      renderCarrerasGrid();

    } catch (error) {
      console.error("Error cargando carreras:", error);
      carrerasTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--danger);">
            Error al cargar carreras: ${error.message}
          </td>
        </tr>
      `;
    }
  }

  function renderCarrerasTable() {
    if (carreras.length === 0) {
      carrerasTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--muted);">
            No hay carreras registradas
          </td>
        </tr>
      `;
      return;
    }

    carrerasTableBody.innerHTML = carreras.map(carrera => {
      return `
        <tr data-carrera-id="${carrera.id_carrera}">
          <td><strong style="color: var(--admin-primary);">${carrera.id_carrera}</strong></td>
          <td>${carrera.nom_carrera}</td>
          <td>${carrera.coordinador_nombre || '<span style="color: var(--muted);">Sin asignar</span>'}</td>
          <td style="text-align: center;">${carrera.total_materias || 0}</td>
          <td style="text-align: center;">${carrera.total_atributos || 0}</td>
          <td style="text-align: center;">-</td>
          <td>
            <div style="display: flex; gap: 0.25rem;">
              <button class="btn btn-outline btn-small" 
                      onclick="editCarrera('${carrera.id_carrera}')" 
                      title="Editar carrera">
                ✏️
              </button>
              <button class="btn btn-outline btn-small" 
                      onclick="viewCarreraDetails('${carrera.id_carrera}')" 
                      title="Ver detalles">
                👁️
              </button>
              <button class="btn btn-danger btn-small" 
                      onclick="deleteCarrera('${carrera.id_carrera}')" 
                      title="Eliminar carrera">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderCarrerasGrid() {
    if (carreras.length === 0) {
      carrerasGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--muted);">
          No hay carreras para mostrar
        </div>
      `;
      return;
    }

    carrerasGrid.innerHTML = carreras.map(carrera => {
      const hasCoordinador = carrera.coordinador_nombre;
      
      return `
        <div style="background: white; border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; transition: transform 0.2s ease, box-shadow 0.2s ease;" 
             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'" 
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
            <div>
              <h3 style="margin: 0 0 0.5rem 0; color: var(--admin-primary); font-size: 1.25rem;">${carrera.id_carrera}</h3>
              <p style="margin: 0; color: var(--text); font-weight: 500; line-height: 1.3;">${carrera.nom_carrera}</p>
            </div>
            <div style="display: flex; gap: 0.25rem;">
              <button class="btn btn-outline btn-small" onclick="editCarrera('${carrera.id_carrera}')" title="Editar">✏️</button>
              <button class="btn btn-outline btn-small" onclick="viewCarreraDetails('${carrera.id_carrera}')" title="Detalles">👁️</button>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; font-size: 0.9rem;">
            <div style="text-align: center; padding: 0.75rem; background: #f8fafc; border-radius: 6px;">
              <div style="font-size: 1.25rem; font-weight: bold; color: var(--admin-primary);">${carrera.total_materias || 0}</div>
              <div style="color: var(--muted);">Materias</div>
            </div>
            <div style="text-align: center; padding: 0.75rem; background: #f8fafc; border-radius: 6px;">
              <div style="font-size: 1.25rem; font-weight: bold; color: var(--success);">${carrera.total_atributos || 0}</div>
              <div style="color: var(--muted);">Atributos</div>
            </div>
            <div style="text-align: center; padding: 0.75rem; background: #f8fafc; border-radius: 6px;">
              <div style="font-size: 1.25rem; font-weight: bold; color: var(--warning);">0</div>
              <div style="color: var(--muted);">Estudiantes</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${hasCoordinador ? 'var(--success)' : 'var(--muted)'}; display: inline-block;"></span>
              <span style="font-size: 0.85rem; color: var(--muted);">
                ${hasCoordinador ? carrera.coordinador_nombre : 'Sin coordinador'}
              </span>
            </div>
            <button class="btn btn-danger btn-small" onclick="deleteCarrera('${carrera.id_carrera}')">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function openCarreraModal(carreraId = null) {
    currentEditingCarrera = carreraId;
    
    if (carreraId) {
      const carrera = carreras.find(c => c.id_carrera === carreraId);
      carreraModalTitle.textContent = "Editar Carrera";
      document.getElementById('carrera-id').value = carrera.id_carrera;
      document.getElementById('carrera-id').disabled = true;
      document.getElementById('carrera-nombre').value = carrera.nom_carrera;
    } else {
      carreraModalTitle.textContent = "Nueva Carrera";
      carreraForm.reset();
      document.getElementById('carrera-id').disabled = false;
    }

    carreraModal.classList.remove('hidden');
  }

  function closeCarreraModal() {
    carreraModal.classList.add('hidden');
    currentEditingCarrera = null;
  }

  async function saveCarrera() {
    const carreraData = {
      id_carrera: document.getElementById('carrera-id').value.trim().toUpperCase(),
      nom_carrera: document.getElementById('carrera-nombre').value.trim()
    };

    const saveBtn = document.getElementById('carrera-modal-save');
    const saveText = document.getElementById('carrera-save-text');
    const originalText = saveText.textContent;

    try {
      saveBtn.disabled = true;
      saveText.textContent = 'Guardando...';

      if (currentEditingCarrera) {
        await api(`/api/admin/carreras/${currentEditingCarrera}`, {
          method: 'PUT',
          body: { nom_carrera: carreraData.nom_carrera }
        });
      } else {
        await api('/api/admin/carreras', {
          method: 'POST',
          body: carreraData
        });
      }

      closeCarreraModal();
      await loadCarreras();

    } catch (error) {
      console.error('Error guardando carrera:', error);
      alert(`Error: ${error.message}`);
    } finally {
      saveBtn.disabled = false;
      saveText.textContent = originalText;
    }
  }

  function viewCarreraDetails(carreraId) {
    const carrera = carreras.find(c => c.id_carrera === carreraId);
    document.getElementById('details-modal-title').textContent = `Detalles: ${carrera.id_carrera}`;
    
    document.getElementById('carrera-details-content').innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div>
          <h4 style="margin: 0 0 1rem 0;">Información General</h4>
          <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
            <p><strong>ID:</strong> ${carrera.id_carrera}</p>
            <p><strong>Nombre:</strong> ${carrera.nom_carrera}</p>
            <p><strong>Coordinador:</strong> ${carrera.coordinador_nombre || 'Sin asignar'}</p>
            ${carrera.coordinador_email ? `<p><strong>Email:</strong> ${carrera.coordinador_email}</p>` : ''}
          </div>
        </div>
        <div>
          <h4 style="margin: 0 0 1rem 0;">Estadísticas</h4>
          <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
            <p><strong>Materias:</strong> ${carrera.total_materias || 0}</p>
            <p><strong>Atributos de Egreso:</strong> ${carrera.total_atributos || 0}</p>
            <p><strong>Estudiantes:</strong> Próximamente</p>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 1.5rem;">
        <h4 style="margin: 0 0 1rem 0;">Acciones Disponibles</h4>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-admin-primary" onclick="editCarrera('${carrera.id_carrera}'); closeDetailsModal();">
            ✏️ Editar Carrera
          </button>
          <button class="btn btn-outline" onclick="alert('Función próximamente')">
            📊 Ver Reportes
          </button>
          <button class="btn btn-outline" onclick="alert('Función próximamente')">
            👥 Gestionar Estudiantes
          </button>
        </div>
      </div>
    `;
    
    detailsModal.classList.remove('hidden');
  }

  function closeDetailsModal() {
    detailsModal.classList.add('hidden');
  }

  // Funciones globales para eventos
  window.editCarrera = (carreraId) => openCarreraModal(carreraId);
  window.closeDetailsModal = closeDetailsModal;

  window.deleteCarrera = async (carreraId) => {
    const carrera = carreras.find(c => c.id_carrera === carreraId);
    
    try {
      await api(`/api/admin/carreras/${carreraId}`, { method: 'DELETE' });
      await loadCarreras();
    } catch (error) {
      if (error.status === 409 && error.data?.code === "DEPENDENCIES_FOUND") {
        const counts = error.data.counts;
        window.openConfirmModal({
          title: "Eliminar Carrera con Dependencias",
          content: `
            <p>La carrera <strong>${carrera.nom_carrera}</strong> tiene dependencias:</p>
            <ul style="margin: 0.5rem 0 1rem 1.5rem;">
              <li><strong>${counts.materias}</strong> materias</li>
              <li><strong>${counts.coordinadores}</strong> coordinadores asignados</li>
            </ul>
            <p>Si continúas, se eliminarán <strong>también</strong> estos elementos. Esta acción es irreversible.</p>
          `,
          okText: "Eliminar Todo",
          onConfirm: async () => {
            try {
              await api(`/api/admin/carreras/${carreraId}?force=1`, { method: 'DELETE' });
              await loadCarreras();
            } catch (error) {
              alert(`Error eliminando carrera: ${error.message}`);
            }
          }
        });
      } else {
        alert(`Error eliminando carrera: ${error.message}`);
      }
    }
  };

  window.viewCarreraDetails = viewCarreraDetails;

  // Event Listeners
  refreshBtn.addEventListener('click', loadCarreras);
  addCarreraBtn.addEventListener('click', () => openCarreraModal());
  carreraModalCancel.addEventListener('click', closeCarreraModal);
  detailsModalClose.addEventListener('click', closeDetailsModal);
  
  carreraModal.addEventListener('click', (e) => {
    if (e.target === carreraModal) closeCarreraModal();
  });

  detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) closeDetailsModal();
  });

  document.getElementById('carrera-id').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
  });

  carreraForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveCarrera();
  });

  // Inicialización
  await loadCarreras();
}