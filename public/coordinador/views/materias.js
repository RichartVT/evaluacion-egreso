// public/coordinador/views/materias.js - Vista integrada (SIN CSS)
import { api } from "../../assets/js/api.js";
import { openConfirmModal } from "../helpers/modal-util.js";
import { smartForms } from "../helpers/smart-forms.js";
export async function renderCoordinatorSubjects({ root, selectedCareerId }) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '../../assets/css/vista-integrada.css'; // ← CORREGIDO: Dos niveles arriba
  link.id = 'vista-integrada-css';
  
  // Remover CSS anterior si existe y agregar nuevo
  const existingCSS = document.getElementById('vista-integrada-css');
  if (existingCSS) {
    existingCSS.remove();
  }
  
  document.head.appendChild(link);
  
  // Esperar a que se cargue el CSS
  await new Promise((resolve) => {
    link.onload = () => {
      console.log('CSS cargado correctamente desde:', link.href);
      resolve();
    };
    link.onerror = () => {
      console.error('Error cargando CSS desde:', link.href);
      resolve(); // Continue even if CSS fails
    };
    setTimeout(resolve, 2000); // Fallback timeout aumentado
  });

  root.innerHTML = `
    <section>
      <div class="header-section">
        <div class="header-info">
          <h2>Vista Integrada - Materias y Atributos</h2>
          <div class="breadcrumb">
            <span>Panel Coordinador</span> > <span class="career-name">${selectedCareerId}</span> > Vista Integrada
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" id="export-btn">📊 Exportar Reporte</button>
          <button class="btn btn-primary" id="add-materia-btn">+ Nueva Materia</button>
        </div>
      </div>

      <div class="search-filters">
        <input type="text" class="search-box" placeholder="Buscar materias..." id="search-materias">
        <select class="filter-select" id="filter-atributo">
          <option value="">Todos los AE</option>
        </select>
        <select class="filter-select" id="filter-nivel">
          <option value="">Todos los niveles</option>
          <option value="I">Introductorio</option>
          <option value="M">Medio</option>
          <option value="A">Avanzado</option>
        </select>
        <button class="btn btn-outline" id="refresh-btn">🔄 Actualizar</button>
      </div>

      <div id="materias-container" class="materias-container">
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando materias...</p>
        </div>
      </div>

      <!-- Modal para agregar/editar materia -->
      <div id="materia-modal" class="modal-overlay hidden">
        <div class="modal">
          <header>
            <h3 id="modal-title">Agregar Materia</h3>
          </header>
          <div class="content">
            <form id="materia-form">
              <div class="form-row">
                <label>
                  Clave de la materia
                  <input id="materia-clave" type="text" placeholder="Ej: SCD-1015" maxlength="12" required>
                </label>
                <label>
                  Nombre de la materia
                  <input id="materia-nombre" type="text" placeholder="Ej: Programación Web" required>
                </label>
              </div>
              <div class="form-row">
                <label>
                  Fecha inicio (opcional)
                  <input id="materia-inicio" type="date">
                </label>
                <label>
                  Fecha fin (opcional)
                  <input id="materia-fin" type="date">
                </label>
              </div>
            </form>
          </div>
          <div class="actions">
            <button class="btn btn-outline" id="modal-cancel">Cancelar</button>
            <button class="btn btn-primary" id="modal-save">Guardar</button>
          </div>
        </div>
      </div>

      <!-- Modal para asignar AE -->
      <div id="ae-modal" class="modal-overlay hidden">
        <div class="modal">
          <header>
            <h3 id="ae-modal-title">Asignar Atributo de Egreso</h3>
          </header>
          <div class="content">
            <form id="ae-form">
              <label>
                Atributo de Egreso
                <select id="ae-select" required></select>
              </label>
              <label>
                Nivel de contribución
                <select id="nivel-select" required>
                  <option value="I">I - Introductorio</option>
                  <option value="M">M - Medio</option>
                  <option value="A">A - Avanzado</option>
                </select>
              </label>
            </form>
          </div>
          <div class="actions">
            <button class="btn btn-outline" id="ae-modal-cancel">Cancelar</button>
            <button class="btn btn-primary" id="ae-modal-save">Asignar</button>
          </div>
        </div>
      </div>

      <!-- Modal para criterio -->
      <div id="criterio-modal" class="modal-overlay hidden">
        <div class="modal">
          <header>
            <h3 id="criterio-modal-title">Agregar Criterio</h3>
          </header>
          <div class="content">
            <form id="criterio-form">
              <label>
                ID del criterio
                <input id="criterio-id" type="number" min="1" max="99" required>
              </label>
              <label>
                Descripción del criterio
                <textarea id="criterio-desc" rows="2" placeholder="Ej: Analiza problemas identificando requerimientos" required></textarea>
              </label>
              <div class="niveles-section">
                <h4>Niveles de desempeño:</h4>
                <label>
                  Nivel 1 (No suficiente)
                  <textarea id="nivel-1" rows="2" placeholder="Descripción del nivel más bajo" required></textarea>
                </label>
                <label>
                  Nivel 2 (Suficiente)
                  <textarea id="nivel-2" rows="2" placeholder="Descripción del nivel básico" required></textarea>
                </label>
                <label>
                  Nivel 3 (Bueno)
                  <textarea id="nivel-3" rows="2" placeholder="Descripción del nivel competente" required></textarea>
                </label>
                <label>
                  Nivel 4 (Muy bueno)
                  <textarea id="nivel-4" rows="2" placeholder="Descripción del nivel excelente" required></textarea>
                </label>
              </div>
            </form>
          </div>
          <div class="actions">
            <button class="btn btn-outline" id="criterio-modal-cancel">Cancelar</button>
            <button class="btn btn-primary" id="criterio-modal-save">Guardar</button>
          </div>
        </div>
      </div>
    </section>
  `;

  // Estado de la aplicación
  let materias = [];
  let atributos = [];
  let currentEditingMateria = null;
  let currentEditingAE = { materiaId: null, atributoId: null };
  let currentEditingCriterio = { materiaId: null, atributoId: null, criterioId: null };

  // Referencias a elementos
  const materiasContainer = root.querySelector("#materias-container");
  const searchBox = root.querySelector("#search-materias");
  const filterAtributo = root.querySelector("#filter-atributo");
  const filterNivel = root.querySelector("#filter-nivel");

  // Modales
  const materiaModal = root.querySelector("#materia-modal");
  const aeModal = root.querySelector("#ae-modal");
  const criterioModal = root.querySelector("#criterio-modal");

  // Cargar datos iniciales
  async function loadInitialData() {
    try {
      // Cargar materias, atributos y crear estructura integrada
      const [materiasData, atributosData] = await Promise.all([
        api(`/api/materias?carrera=${encodeURIComponent(selectedCareerId)}`),
        api(`/api/atributos?carrera=${encodeURIComponent(selectedCareerId)}`)
      ]);

      materias = materiasData;
      atributos = atributosData;

      // Poblar filtro de atributos
      filterAtributo.innerHTML = '<option value="">Todos los AE</option>' +
        atributos.map(attr => 
          `<option value="${attr.id_atributo}">AE${String(attr.id_atributo).padStart(2, '0')} - ${attr.nomcorto || attr.nom_atributo}</option>`
        ).join('');

      await loadMateriasIntegrated();
    } catch (error) {
      materiasContainer.innerHTML = `
        <div class="empty-state">
          <p style="color: #ef4444;">Error al cargar datos: ${error.message}</p>
          <button class="btn btn-primary" onclick="location.reload()">Reintentar</button>
        </div>
      `;
    }
  }

  // Cargar materias con datos integrados
  async function loadMateriasIntegrated() {
    materiasContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Cargando vista integrada...</p></div>';

    try {
      // Para cada materia, obtener sus atributos asignados y criterios
      const materiasConDatos = await Promise.all(
        materias.map(async (materia) => {
          const [mapeos, criterios] = await Promise.all([
            api(`/api/niveles-materia?carrera=${encodeURIComponent(selectedCareerId)}&materia=${encodeURIComponent(materia.id_materia)}`),
            api(`/api/criterios?carrera=${encodeURIComponent(selectedCareerId)}`)
          ]);

          // Agrupar criterios por atributo
          const criteriosPorAtributo = {};
          criterios.forEach(criterio => {
            if (!criteriosPorAtributo[criterio.id_atributo]) {
              criteriosPorAtributo[criterio.id_atributo] = [];
            }
            criteriosPorAtributo[criterio.id_atributo].push(criterio);
          });

          // Combinar mapeos con información completa de atributos y criterios
          const atributosAsignados = mapeos.map(mapeo => ({
            ...mapeo,
            criterios: criteriosPorAtributo[mapeo.id_atributo] || []
          }));

          return {
            ...materia,
            atributosAsignados
          };
        })
      );

      renderMaterias(materiasConDatos);
    } catch (error) {
      materiasContainer.innerHTML = `
        <div class="empty-state">
          <p style="color: #ef4444;">Error al cargar vista integrada: ${error.message}</p>
        </div>
      `;
    }
  }

  // Renderizar materias
  function renderMaterias(materiasData) {
    if (materiasData.length === 0) {
      materiasContainer.innerHTML = `
        <div class="empty-state">
          <h3>No hay materias registradas</h3>
          <p>Comienza agregando una materia para la carrera ${selectedCareerId}</p>
          <button class="btn btn-primary" onclick="openMateriaModal()">+ Agregar Primera Materia</button>
        </div>
      `;
      return;
    }

    materiasContainer.innerHTML = materiasData.map(createMateriaCard).join('');
    
    // Agregar event listeners
    materiasContainer.querySelectorAll('.materia-header').forEach(header => {
      header.addEventListener('click', (e) => {
        // No expandir si se hizo clic en un botón
        if (e.target.closest('button')) return;
        
        const card = header.closest('.materia-card');
        card.classList.toggle('expanded');
      });
    });
  }

  // Crear tarjeta de materia
  function createMateriaCard(materia) {
    const atributosCount = materia.atributosAsignados?.length || 0;
    const criteriosCount = materia.atributosAsignados?.reduce((sum, attr) => sum + (attr.criterios?.length || 0), 0) || 0;
    
    const fechaInicio = materia.mat_fecini || 'No definida';
    const fechaFin = materia.mat_fecfin || 'Vigente';

    return `
      <div class="materia-card" id="materia-${materia.id_materia}">
        <div class="materia-header">
          <div>
            <div class="materia-title">
              <span class="materia-code">${materia.id_materia}</span> - ${materia.nom_materia}
            </div>
            <div class="materia-stats">
              <span>📅 ${fechaInicio} / ${fechaFin}</span>
              <span>🎯 ${atributosCount} AE asignados</span>
              <span>📋 ${criteriosCount} criterios</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button class="btn btn-outline btn-small" onclick="editMateria('${materia.id_materia}')" title="Editar materia">
              ✏️
            </button>
            <button class="btn btn-danger btn-small" onclick="deleteMateria('${materia.id_materia}')" title="Eliminar materia">
              🗑️
            </button>
            <span class="expand-icon">▶</span>
          </div>
        </div>
        <div class="materia-content">
          ${atributosCount > 0 ? 
            materia.atributosAsignados.map(attr => createAtributoSection(materia.id_materia, attr)).join('') :
            '<div class="empty-state">No hay atributos asignados a esta materia</div>'
          }
          <div class="add-section" onclick="openAEModal('${materia.id_materia}')">
            <div class="add-section-text">+ Asignar nuevo Atributo de Egreso</div>
          </div>
        </div>
      </div>
    `;
  }

  // Crear sección de atributo
  function createAtributoSection(materiaId, atributo) {
    const nivelTexto = { 'I': 'Introductorio', 'M': 'Medio', 'A': 'Avanzado' };
    
    return `
      <div class="atributo-section" data-atributo="${atributo.id_atributo}">
        <div class="atributo-header">
          <div class="atributo-info">
            <div class="atributo-id">AE${String(atributo.id_atributo).padStart(2, '0')}: ${atributo.atributo_corto || 'Sin nombre corto'}</div>
            <div class="atributo-name">${atributo.atributo_nombre || 'Sin descripción'}</div>
          </div>
          <div style="display: flex; align-items: center;">
            <span class="nivel-badge nivel-${atributo.nivel}">
              Nivel ${atributo.nivel} - ${nivelTexto[atributo.nivel]}
            </span>
            <div class="atributo-actions">
              <button class="btn btn-outline btn-small" onclick="editNivelAE('${materiaId}', ${atributo.id_atributo})" title="Cambiar nivel">
                ✏️ Nivel
              </button>
              <button class="btn btn-danger btn-small" onclick="removeAE('${materiaId}', ${atributo.id_atributo})" title="Quitar AE">
                🗑️
              </button>
            </div>
          </div>
        </div>
        <div class="criterios-list">
          ${atributo.criterios && atributo.criterios.length > 0 ? 
            atributo.criterios.map(criterio => createCriterioItem(materiaId, atributo.id_atributo, criterio)).join('') :
            '<div class="no-criterios-message">No hay criterios definidos para este atributo</div>'
          }
          <div class="add-section" onclick="openCriterioModal('${materiaId}', ${atributo.id_atributo})">
            <div class="add-section-text">+ Agregar criterio de evaluación</div>
          </div>
        </div>
      </div>
    `;
  }

  // Crear item de criterio
  function createCriterioItem(materiaId, atributoId, criterio) {
    return `
      <div class="criterio-item">
        <div class="criterio-id">C${String(criterio.id_criterio).padStart(2, '0')}</div>
        <div class="criterio-desc">
          <div class="criterio-title">${criterio.descripcion}</div>
          <div class="criterio-levels">
            <div class="level-item">
              <span class="level-label">N1:</span> ${criterio.des_n1}
            </div>
            <div class="level-item">
              <span class="level-label">N2:</span> ${criterio.des_n2}
            </div>
            <div class="level-item">
              <span class="level-label">N3:</span> ${criterio.des_n3}
            </div>
            <div class="level-item">
              <span class="level-label">N4:</span> ${criterio.des_n4}
            </div>
          </div>
        </div>
        <div class="criterio-actions">
          <button class="btn btn-outline btn-small" onclick="editCriterio('${materiaId}', ${atributoId}, ${criterio.id_criterio})" title="Editar criterio">
            ✏️
          </button>
          <button class="btn btn-danger btn-small" onclick="deleteCriterio('${materiaId}', ${atributoId}, ${criterio.id_criterio})" title="Eliminar criterio">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  function addContextualHelp(form, atributoId) {
    const atributo = atributos.find(a => a.id_atributo === atributoId);
    if (!atributo) return;
    
    // Crear elemento de ayuda contextual
    const helpElement = document.createElement('div');
    helpElement.className = 'contextual-help';
    helpElement.style.cssText = `
      background: #f0fdf4;
      border: 1px solid #16a34a;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    `;
    
    helpElement.innerHTML = `
      <div style="font-weight: 600; color: #16a34a; margin-bottom: 0.5rem;">
        💡 Creando criterio para: AE${String(atributoId).padStart(2, '0')} - ${atributo.nomcorto}
      </div>
      <div style="color: #166534;">
        ${atributo.nom_atributo}
      </div>
      <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #059669;">
        💡 Sugerencia: Los criterios deben ser medibles y específicos. Comienza con verbos como "Comprende", "Aplica", "Evalúa", etc.
      </div>
    `;
    
    // Insertar al inicio del formulario
    const firstInput = form.querySelector('input, textarea');
    if (firstInput) {
      firstInput.parentElement.insertBefore(helpElement, firstInput);
    }
  }

  // Funciones globales para eventos
  window.openMateriaModal = (materiaId = null) => {
    currentEditingMateria = materiaId;
    const modal = root.querySelector("#materia-modal");
    const title = root.querySelector("#modal-title");
    const form = root.querySelector("#materia-form");
    
    if (materiaId) {
      const materia = materias.find(m => m.id_materia === materiaId);
      title.textContent = "Editar Materia";
      root.querySelector("#materia-clave").value = materia.id_materia;
      root.querySelector("#materia-nombre").value = materia.nom_materia;
      root.querySelector("#materia-inicio").value = materia.mat_fecini || '';
      root.querySelector("#materia-fin").value = materia.mat_fecfin || '';
      root.querySelector("#materia-clave").disabled = true;
    } else {
      title.textContent = "Agregar Materia";
      form.reset();
      root.querySelector("#materia-clave").disabled = false;
    }
    
    modal.classList.remove("hidden");
    
    // INTEGRACIÓN SMART FORMS 
    setTimeout(() => {
      smartForms.initializeForm(form, 'materia', selectedCareerId);
    }, 100);
  };

  window.editMateria = (materiaId) => openMateriaModal(materiaId);

  window.deleteMateria = async (materiaId) => {
    const materia = materias.find(m => m.id_materia === materiaId);
    
    openConfirmModal({
      title: "Eliminar Materia",
      html: `
        <p>¿Estás seguro de eliminar la materia <strong>${materia.nom_materia}</strong>?</p>
        <p>Se eliminarán también todos sus atributos asignados y evaluaciones relacionadas.</p>
      `,
      okText: "Eliminar",
      okVariant: "danger",
      onConfirm: async () => {
        try {
          await api(`/api/materias/${encodeURIComponent(materiaId)}?force=1`, {
            method: "DELETE"
          });
          await loadMateriasIntegrated();
        } catch (error) {
          alert("Error al eliminar materia: " + error.message);
        }
      }
    });
  };

  window.openAEModal = (materiaId) => {
    currentEditingAE.materiaId = materiaId;
    const modal = root.querySelector("#ae-modal");
    const select = root.querySelector("#ae-select");
    
    // Poblar select con atributos disponibles
    select.innerHTML = atributos.map(attr => 
      `<option value="${attr.id_atributo}">AE${String(attr.id_atributo).padStart(2, '0')} - ${attr.nomcorto || attr.nom_atributo}</option>`
    ).join('');
    
    modal.classList.remove("hidden");
  };

  window.editNivelAE = async (materiaId, atributoId) => {
    // Similar a openAEModal pero para editar nivel existente
    openAEModal(materiaId);
    currentEditingAE.atributoId = atributoId;
    
    try {
      const mapeos = await api(`/api/niveles-materia?carrera=${encodeURIComponent(selectedCareerId)}&materia=${encodeURIComponent(materiaId)}`);
      const mapeo = mapeos.find(m => m.id_atributo === atributoId);
      
      if (mapeo) {
        root.querySelector("#ae-select").value = atributoId;
        root.querySelector("#nivel-select").value = mapeo.nivel;
        root.querySelector("#ae-modal-title").textContent = "Editar Nivel de AE";
      }
    } catch (error) {
      alert("Error al cargar datos del AE: " + error.message);
    }
  };

  window.removeAE = async (materiaId, atributoId) => {
    openConfirmModal({
      title: "Quitar Atributo de Egreso",
      html: `
        <p>¿Estás seguro de quitar el AE${String(atributoId).padStart(2, '0')} de esta materia?</p>
        <p>Se eliminarán también todas las evaluaciones relacionadas.</p>
      `,
      okText: "Quitar",
      okVariant: "danger",
      onConfirm: async () => {
        try {
          await api(`/api/niveles-materia/${encodeURIComponent(selectedCareerId)}/${encodeURIComponent(materiaId)}/${atributoId}?force=1`, {
            method: "DELETE"
          });
          await loadMateriasIntegrated();
        } catch (error) {
          alert("Error al quitar AE: " + error.message);
        }
      }
    });
  };

window.openCriterioModal = (materiaId, atributoId, criterioId = null) => {
  currentEditingCriterio = { materiaId, atributoId, criterioId };
  const modal = root.querySelector("#criterio-modal");
  const title = root.querySelector("#criterio-modal-title");
  const form = root.querySelector("#criterio-form");
  
  if (criterioId) {
    title.textContent = "Editar Criterio";
    loadCriterioData(selectedCareerId, atributoId, criterioId);
  } else {
    title.textContent = "Agregar Criterio";
    form.reset();
  }
  
  modal.classList.remove("hidden");
  
  //  INTEGRACIÓN SMART FORMS PARA CRITERIOS 
  setTimeout(() => {
    smartForms.initializeForm(form, 'criterio', selectedCareerId);
    
    // Agregar información contextual al formulario
    addContextualHelp(form, atributoId);
  }, 100);
};

  window.editCriterio = (materiaId, atributoId, criterioId) => {
    openCriterioModal(materiaId, atributoId, criterioId);
  };

  window.deleteCriterio = async (materiaId, atributoId, criterioId) => {
    openConfirmModal({
      title: "Eliminar Criterio",
      html: `
        <p>¿Estás seguro de eliminar el criterio C${String(criterioId).padStart(2, '0')}?</p>
        <p>Se eliminarán también todas las evaluaciones de este criterio.</p>
      `,
      okText: "Eliminar",
      okVariant: "danger",
      onConfirm: async () => {
        try {
          await api(`/api/criterios/${encodeURIComponent(selectedCareerId)}/${atributoId}/${criterioId}?force=1`, {
            method: "DELETE"
          });
          await loadMateriasIntegrated();
        } catch (error) {
          alert("Error al eliminar criterio: " + error.message);
        }
      }
    });
  };

  async function loadCriterioData(careerId, atributoId, criterioId) {
    try {
      const criterios = await api(`/api/criterios?carrera=${encodeURIComponent(careerId)}&atributo=${atributoId}`);
      const criterio = criterios.find(c => c.id_criterio === criterioId);
      
      if (criterio) {
        root.querySelector("#criterio-id").value = criterio.id_criterio;
        root.querySelector("#criterio-desc").value = criterio.descripcion;
        root.querySelector("#nivel-1").value = criterio.des_n1;
        root.querySelector("#nivel-2").value = criterio.des_n2;
        root.querySelector("#nivel-3").value = criterio.des_n3;
        root.querySelector("#nivel-4").value = criterio.des_n4;
        root.querySelector("#criterio-id").disabled = true;
      }
    } catch (error) {
      alert("Error al cargar criterio: " + error.message);
    }
  }

  // Event listeners para modales
  root.querySelector("#modal-cancel").addEventListener("click", () => {
    materiaModal.classList.add("hidden");
  });

  root.querySelector("#modal-save").addEventListener("click", async () => {
    const form = root.querySelector("#materia-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const materiaData = {
      id_materia: root.querySelector("#materia-clave").value.trim(),
      nom_materia: root.querySelector("#materia-nombre").value.trim(),
      id_carrera: selectedCareerId,
      mat_fecini: root.querySelector("#materia-inicio").value || null,
      mat_fecfin: root.querySelector("#materia-fin").value || null
    };

    try {
      if (currentEditingMateria) {
        await api(`/api/materias/${encodeURIComponent(currentEditingMateria)}`, {
          method: "PUT",
          body: {
            nom_materia: materiaData.nom_materia,
            mat_fecini: materiaData.mat_fecini,
            mat_fecfin: materiaData.mat_fecfin
          }
        });
      } else {
        await api("/api/materias", {
          method: "POST",
          body: materiaData
        });
      }
      
      materiaModal.classList.add("hidden");
      await loadInitialData();
    } catch (error) {
      alert("Error al guardar materia: " + error.message);
    }
  });

  root.querySelector("#ae-modal-cancel").addEventListener("click", () => {
    aeModal.classList.add("hidden");
  });

  root.querySelector("#ae-modal-save").addEventListener("click", async () => {
    const atributoId = parseInt(root.querySelector("#ae-select").value);
    const nivel = root.querySelector("#nivel-select").value;

    try {
      if (currentEditingAE.atributoId) {
        // Primero eliminar el mapeo existente, luego crear uno nuevo
        await api(`/api/niveles-materia/${encodeURIComponent(selectedCareerId)}/${encodeURIComponent(currentEditingAE.materiaId)}/${currentEditingAE.atributoId}`, {
          method: "DELETE"
        });
      }

      await api("/api/niveles-materia", {
        method: "POST",
        body: {
          id_carrera: selectedCareerId,
          id_materia: currentEditingAE.materiaId,
          id_atributo: atributoId,
          nivel: nivel
        }
      });
      
      aeModal.classList.add("hidden");
      currentEditingAE = { materiaId: null, atributoId: null };
      await loadMateriasIntegrated();
    } catch (error) {
      alert("Error al asignar AE: " + error.message);
    }
  });

  root.querySelector("#criterio-modal-cancel").addEventListener("click", () => {
    criterioModal.classList.add("hidden");
  });

  root.querySelector("#criterio-modal-save").addEventListener("click", async () => {
    const form = root.querySelector("#criterio-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const criterioData = {
      id_carrera: selectedCareerId,
      id_atributo: currentEditingCriterio.atributoId,
      id_criterio: parseInt(root.querySelector("#criterio-id").value),
      descripcion: root.querySelector("#criterio-desc").value.trim(),
      des_n1: root.querySelector("#nivel-1").value.trim(),
      des_n2: root.querySelector("#nivel-2").value.trim(),
      des_n3: root.querySelector("#nivel-3").value.trim(),
      des_n4: root.querySelector("#nivel-4").value.trim()
    };

    try {
      if (currentEditingCriterio.criterioId) {
        await api(`/api/criterios/${encodeURIComponent(selectedCareerId)}/${currentEditingCriterio.atributoId}/${currentEditingCriterio.criterioId}`, {
          method: "PUT",
          body: {
            descripcion: criterioData.descripcion,
            des_n1: criterioData.des_n1,
            des_n2: criterioData.des_n2,
            des_n3: criterioData.des_n3,
            des_n4: criterioData.des_n4
          }
        });
      } else {
        await api("/api/criterios", {
          method: "POST",
          body: criterioData
        });
      }
      
      criterioModal.classList.add("hidden");
      currentEditingCriterio = { materiaId: null, atributoId: null, criterioId: null };
      await loadMateriasIntegrated();
    } catch (error) {
      alert("Error al guardar criterio: " + error.message);
    }
  });

  // Event listeners para botones principales
  root.querySelector("#add-materia-btn").addEventListener("click", () => openMateriaModal());
  
  root.querySelector("#export-btn").addEventListener("click", () => {
    alert("Funcionalidad de exportar en desarrollo");
  });
  
  root.querySelector("#refresh-btn").addEventListener("click", () => {
    loadMateriasIntegrated();
  });

  // Event listeners para filtros
  searchBox.addEventListener("input", () => {
    filterMaterias();
  });

  filterAtributo.addEventListener("change", () => {
    filterMaterias();
  });

  filterNivel.addEventListener("change", () => {
    filterMaterias();
  });

  function filterMaterias() {
    const searchTerm = searchBox.value.toLowerCase();
    const selectedAtributo = filterAtributo.value;
    const selectedNivel = filterNivel.value;

    const materiaCards = materiasContainer.querySelectorAll('.materia-card');
    
    materiaCards.forEach(card => {
      const materiaTitle = card.querySelector('.materia-title').textContent.toLowerCase();
      
      let matchesSearch = materiaTitle.includes(searchTerm);
      let matchesAtributo = true;
      let matchesNivel = true;

      if (selectedAtributo) {
        const hasAtributo = card.querySelector(`[data-atributo="${selectedAtributo}"]`) !== null;
        matchesAtributo = hasAtributo;
      }

      if (selectedNivel) {
        const hasNivel = card.querySelector(`.nivel-${selectedNivel}`) !== null;
        matchesNivel = hasNivel;
      }

      const shouldShow = matchesSearch && matchesAtributo && matchesNivel;
      card.style.display = shouldShow ? 'block' : 'none';
    });
  }

  // Cerrar modales al hacer clic fuera
  [materiaModal, aeModal, criterioModal].forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
  });

  // Inicializar
  await loadInitialData();
}