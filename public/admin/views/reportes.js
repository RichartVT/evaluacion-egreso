// public/admin/views/reportes.js
import { api } from "../../assets/js/api.js";

export async function renderAdminReportes({ root }) {
  let dashboardStats = {};
  let selectedCarrera = '';
  let carreras = [];

  // HTML de la vista
  root.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <h2 class="admin-section-title">Reportes del Sistema</h2>
        <div>
          <select class="admin-select" id="filter-carrera-reportes">
            <option value="">Todas las carreras</option>
          </select>
          <button class="btn btn-outline" id="refresh-reportes">🔄 Actualizar</button>
          <button class="btn btn-admin-primary" id="export-reportes">📊 Exportar</button>
        </div>
      </div>

      <!-- Estadísticas generales -->
      <div class="dashboard-stats" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 2rem;">
        <div class="stat-card">
          <div class="stat-number" id="stat-usuarios">-</div>
          <div class="stat-label">Total Usuarios</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="stat-carreras">-</div>
          <div class="stat-label">Carreras</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="stat-estudiantes">-</div>
          <div class="stat-label">Estudiantes</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="stat-materias">-</div>
          <div class="stat-label">Materias</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="stat-atributos">-</div>
          <div class="stat-label">Atributos de Egreso</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="stat-evaluaciones">-</div>
          <div class="stat-label">Evaluaciones Completadas</div>
        </div>
      </div>

      <!-- Gráficos principales -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
        <!-- Distribución de usuarios por rol -->
        <div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border);">
          <h3 style="margin: 0 0 1rem 0;">Distribución de Usuarios</h3>
          <div id="usuarios-chart" style="min-height: 300px;">
            <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: var(--muted);">
              <div class="spinner" style="margin-right: 1rem;"></div>
              Cargando datos...
            </div>
          </div>
        </div>

        <!-- Evaluaciones por período -->
        <div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border);">
          <h3 style="margin: 0 0 1rem 0;">Evaluaciones por Período</h3>
          <div id="evaluaciones-chart" style="min-height: 300px;">
            <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: var(--muted);">
              <div class="spinner" style="margin-right: 1rem;"></div>
              Cargando datos...
            </div>
          </div>
        </div>
      </div>

      <!-- Gráficos con filtros específicos -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
        <!-- Distribución Likert -->
        <div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border);">
          <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0;">Distribución Likert</h3>
            <select class="admin-select" id="likert-filter-carrera" style="max-width: 200px; margin-left: 1rem;">
              <option value="">Todas las carreras</option>
            </select>
          </div>
          <div id="likert-chart" style="min-height: 300px;">
            <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: var(--muted);">
              <div class="spinner" style="margin-right: 1rem;"></div>
              Cargando datos...
            </div>
          </div>
        </div>

        <!-- Evolución del desempeño -->
        <div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border);">
          <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0;">Evolución del Desempeño</h3>
            <select class="admin-select" id="evolucion-filter-carrera" style="max-width: 200px; margin-left: 1rem;">
              <option value="">Todas las carreras</option>
            </select>
          </div>
          <div id="evolucion-chart" style="min-height: 300px;">
            <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: var(--muted);">
              <div class="spinner" style="margin-right: 1rem;"></div>
              Cargando datos...
            </div>
          </div>
        </div>
      </div>

      <!-- Top materias -->
      <div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 2rem;">
        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem;">
          <h3 style="margin: 0;">Top 10 Materias por Desempeño</h3>
          <select class="admin-select" id="top-materias-filter-carrera" style="max-width: 200px;">
            <option value="">Todas las carreras</option>
          </select>
        </div>
        <div id="top-materias-chart" style="max-height: 600px; overflow-y: auto;">
          <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--muted);">
            <div class="spinner" style="margin-right: 1rem;"></div>
            Cargando datos...
          </div>
        </div>
      </div>

      <!-- Estadísticas por carrera -->
      <div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 2rem;">
        <h3 style="margin: 0 0 1rem 0;">Estadísticas por Carrera</h3>
        <div style="overflow-x: auto;">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Carrera</th>
                <th>Coordinador</th>
                <th>Materias</th>
                <th>Atributos</th>
                <th>Estudiantes Activos</th>
                <th>Evaluaciones</th>
                <th>Promedio</th>
              </tr>
            </thead>
            <tbody id="carreras-stats-table">
              <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: var(--muted);">
                  <div class="spinner" style="margin: 0 auto 1rem;"></div>
                  Cargando estadísticas...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Atributos y actividad -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
        <!-- Atributos más evaluados -->
        <div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border);">
          <h3 style="margin: 0 0 1rem 0;">Atributos Más Evaluados</h3>
          <div id="atributos-list" style="max-height: 400px; overflow-y: auto;">
            <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--muted);">
              <div class="spinner" style="margin-right: 1rem;"></div>
              Cargando atributos...
            </div>
          </div>
        </div>

        <!-- Actividad reciente -->
        <div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border);">
          <h3 style="margin: 0 0 1rem 0;">Actividad Reciente</h3>
          <div id="actividad-list" style="max-height: 400px; overflow-y: auto;">
            <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--muted);">
              <div class="spinner" style="margin-right: 1rem;"></div>
              Cargando actividad...
            </div>
          </div>
        </div>
      </div>

      <!-- Rendimiento de materias -->
      <div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border);">
        <h3 style="margin: 0 0 1rem 0;">Rendimiento por Materias</h3>
        <div style="overflow-x: auto;">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Materia</th>
                <th>Carrera</th>
                <th>Estudiantes</th>
                <th>Períodos</th>
                <th>Respuestas</th>
                <th>Promedio</th>
                <th>Rango</th>
                <th>Progreso</th>
              </tr>
            </thead>
            <tbody id="materias-rendimiento-table">
              <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--muted);">
                  <div class="spinner" style="margin: 0 auto 1rem;"></div>
                  Cargando rendimiento...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal de exportación -->
    <div id="export-modal" class="modal-overlay hidden admin-modal">
      <div class="modal">
        <header>
          <h3>Exportar Reportes</h3>
        </header>
        <div class="content">
          <p>Selecciona el tipo de reporte que deseas exportar:</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0;">
            <button class="btn btn-outline" onclick="exportReport('usuarios')">
              👥 Usuarios
            </button>
            <button class="btn btn-outline" onclick="exportReport('carreras')">
              🎓 Carreras
            </button>
            <button class="btn btn-outline" onclick="exportReport('estudiantes')" disabled>
              👨‍🎓 Estudiantes
            </button>
            <button class="btn btn-outline" onclick="exportReport('evaluaciones')" disabled>
              📊 Evaluaciones
            </button>
          </div>
          <div class="form-help-text">
            Los reportes se descargan en formato CSV. Algunos reportes están en desarrollo.
          </div>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-outline" id="export-modal-close">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  // Referencias a elementos
  const filterCarrera = root.querySelector("#filter-carrera-reportes");
  const refreshBtn = root.querySelector("#refresh-reportes");
  const exportBtn = root.querySelector("#export-reportes");
  const exportModal = root.querySelector("#export-modal");
  const exportModalClose = root.querySelector("#export-modal-close");
  
  // Referencias a filtros específicos
  const likertFilterCarrera = root.querySelector("#likert-filter-carrera");
  const evolucionFilterCarrera = root.querySelector("#evolucion-filter-carrera");
  const topMateriasFilterCarrera = root.querySelector("#top-materias-filter-carrera");

  // Funciones principales
  async function loadDashboardStats() {
    try {
      const stats = await api("/api/admin/reportes/dashboard");
      dashboardStats = stats;

      // Actualizar estadísticas
      document.getElementById('stat-usuarios').textContent = stats.total_usuarios || 0;
      document.getElementById('stat-carreras').textContent = stats.total_carreras || 0;
      document.getElementById('stat-estudiantes').textContent = stats.total_estudiantes || 0;
      document.getElementById('stat-materias').textContent = stats.total_materias || 0;
      document.getElementById('stat-atributos').textContent = stats.total_atributos || 0;
      document.getElementById('stat-evaluaciones').textContent = stats.total_evaluaciones || 0;

    } catch (error) {
      console.error("Error cargando estadísticas del dashboard:", error);
    }
  }

  async function loadUsuariosChart() {
    try {
      const data = await api("/api/admin/reportes/usuarios-por-rol");
      const chartContainer = document.getElementById('usuarios-chart');
      
      // Crear gráfico simple con CSS
      chartContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${data.map(item => {
            const percentage = dashboardStats.total_usuarios > 0 
              ? Math.round((item.cantidad / dashboardStats.total_usuarios) * 100)
              : 0;
            
            const colors = {
              'ADMIN': '#ef4444',
              'COORDINADOR': '#3b82f6',
              'ALUMNO': '#22c55e'
            };
            
            return `
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="min-width: 100px; font-weight: 500;">${item.rol}</div>
                <div style="flex: 1; background: #f1f5f9; border-radius: 8px; height: 24px; position: relative; overflow: hidden;">
                  <div style="background: ${colors[item.rol_clave] || '#64748b'}; height: 100%; width: ${percentage}%; transition: width 0.3s ease; border-radius: 8px;"></div>
                </div>
                <div style="min-width: 60px; font-weight: 600; color: ${colors[item.rol_clave] || '#64748b'};">
                  ${item.cantidad} (${percentage}%)
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (error) {
      document.getElementById('usuarios-chart').innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 2rem;">
          Error cargando gráfico de usuarios
        </div>
      `;
    }
  }

  async function loadEvaluacionesChart() {
    try {
      const data = await api("/api/admin/reportes/evaluaciones-por-periodo");
      const chartContainer = document.getElementById('evaluaciones-chart');
      
      if (data.length === 0) {
        chartContainer.innerHTML = `
          <div style="text-align: center; color: var(--muted); padding: 2rem;">
            No hay datos de evaluaciones disponibles
          </div>
        `;
        return;
      }

      const maxValue = Math.max(...data.map(d => d.evaluaciones_materias));
      
      chartContainer.innerHTML = `
        <div style="display: flex; align-items: end; gap: 0.5rem; height: 250px; padding: 1rem 0;">
          ${data.map(item => {
            const height = maxValue > 0 ? Math.max((item.evaluaciones_materias / maxValue) * 200, 5) : 5;
            
            return `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                <div style="font-size: 0.8rem; font-weight: 600; color: var(--admin-primary);">
                  ${item.evaluaciones_materias}
                </div>
                <div style="background: var(--admin-primary); width: 100%; height: ${height}px; border-radius: 4px 4px 0 0; transition: height 0.3s ease;" 
                     title="${item.estudiantes_unicos} estudiantes únicos"></div>
                <div style="font-size: 0.7rem; color: var(--muted); transform: rotate(-45deg); white-space: nowrap;">
                  ${item.periodo}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (error) {
      document.getElementById('evaluaciones-chart').innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 2rem;">
          Error cargando gráfico de evaluaciones
        </div>
      `;
    }
  }

  async function loadLikertDistribution() {
    try {
      const params = selectedCarrera ? `?carrera=${selectedCarrera}` : '';
      const data = await api(`/api/admin/reportes/distribucion-likert${params}`);
      const chartContainer = document.getElementById('likert-chart');
      
      if (data.length === 0) {
        chartContainer.innerHTML = `
          <div style="text-align: center; color: var(--muted); padding: 2rem;">
            No hay datos de evaluaciones disponibles
          </div>
        `;
        return;
      }

      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
      const labels = ['No suficiente', 'Suficiente', 'Bueno', 'Muy bueno'];
      const total = data.reduce((sum, item) => sum + item.cantidad, 0);

      // Gráfico de dona con CSS
      chartContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 2rem;">
          <div style="position: relative; width: 180px; height: 180px;">
            ${data.map((item, index) => {
              const percentage = total > 0 ? (item.cantidad / total) * 100 : 0;
              const prevPercentages = data.slice(0, index).reduce((sum, prev) => 
                sum + (total > 0 ? (prev.cantidad / total) * 100 : 0), 0);
              
              return percentage > 0 ? `
                <div style="
                  position: absolute;
                  width: 180px;
                  height: 180px;
                  border-radius: 50%;
                  background: conic-gradient(
                    from ${prevPercentages * 3.6}deg,
                    ${colors[index]} 0deg ${percentage * 3.6}deg,
                    transparent ${percentage * 3.6}deg
                  );
                  mask: radial-gradient(circle at center, transparent 60px, black 61px);
                  -webkit-mask: radial-gradient(circle at center, transparent 60px, black 61px);
                "></div>
              ` : '';
            }).join('')}
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
            ">
              <div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">${total}</div>
              <div style="font-size: 0.8rem; color: var(--muted);">Total</div>
            </div>
          </div>
          <div style="flex: 1;">
            ${data.map((item, index) => `
              <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                <div style="width: 16px; height: 16px; background: ${colors[index]}; border-radius: 3px;"></div>
                <div style="flex: 1;">
                  <div style="font-weight: 500; color: var(--text);">Nivel ${item.likert}: ${labels[index]}</div>
                  <div style="font-size: 0.8rem; color: var(--muted);">${item.cantidad} respuestas (${item.porcentaje}%)</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (error) {
      document.getElementById('likert-chart').innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 2rem;">
          Error cargando distribución Likert
        </div>
      `;
    }
  }

  async function loadEvolucionDesempeno() {
    try {
      const params = selectedCarrera ? `?carrera=${selectedCarrera}` : '';
      const data = await api(`/api/admin/reportes/evolucion-desempeno${params}`);
      const chartContainer = document.getElementById('evolucion-chart');
      
      if (data.length === 0) {
        chartContainer.innerHTML = `
          <div style="text-align: center; color: var(--muted); padding: 2rem;">
            No hay datos de evolución disponibles
          </div>
        `;
        return;
      }

      // Obtener todos los períodos únicos
      const allPeriodos = [...new Set(
        data.flatMap(attr => attr.data.map(d => d.periodo))
      )].sort();

      const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

      chartContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <!-- Leyenda -->
          <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; font-size: 0.8rem; max-height: 60px; overflow-y: auto;">
            ${data.slice(0, 8).map((attr, index) => `
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 12px; height: 2px; background: ${colors[index % colors.length]};"></div>
                <span>AE${attr.id_atributo}: ${attr.nomcorto || 'Sin nombre'}</span>
              </div>
            `).join('')}
          </div>
          
          <!-- Gráfico -->
          <div style="display: flex; align-items: end; gap: 0.5rem; height: 260px; padding: 1rem 0;">
            ${allPeriodos.map(periodo => `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; height: 100%;">
                <div style="flex: 1; position: relative; width: 100%; display: flex; align-items: end; justify-content: center; gap: 2px;">
                  ${data.slice(0, 8).map((attr, index) => {
                    const dataPoint = attr.data.find(d => d.periodo === periodo);
                    if (!dataPoint) return '';
                    const height = Math.max((dataPoint.promedio / 4) * 200, 3);
                    
                    return `
                      <div style="
                        width: 6px;
                        height: ${height}px;
                        background: ${colors[index % colors.length]};
                        border-radius: 2px 2px 0 0;
                        opacity: 0.8;
                        transition: all 0.3s ease;
                        cursor: pointer;
                      " 
                      title="AE${attr.id_atributo}: ${dataPoint.promedio.toFixed(2)}"
                      onmouseover="this.style.opacity='1'; this.style.transform='scaleY(1.1)'"
                      onmouseout="this.style.opacity='0.8'; this.style.transform='scaleY(1)'">
                      </div>
                    `;
                  }).join('')}
                </div>
                <div style="font-size: 0.7rem; color: var(--muted); transform: rotate(-45deg); white-space: nowrap;">
                  ${periodo}
                </div>
              </div>
            `).join('')}
          </div>
          
          <!-- Escala Y -->
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--muted); padding: 0 1rem;">
            <span>1.0 (No suficiente)</span>
            <span>2.0 (Suficiente)</span>
            <span>3.0 (Bueno)</span>
            <span>4.0 (Muy bueno)</span>
          </div>
        </div>
      `;
    } catch (error) {
      document.getElementById('evolucion-chart').innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 2rem;">
          Error cargando evolución del desempeño
        </div>
      `;
    }
  }

  async function loadTopMaterias() {
    try {
      const params = selectedCarrera ? `?carrera=${selectedCarrera}&limit=10` : '?limit=10';
      const data = await api(`/api/admin/reportes/top-materias-desempeno${params}`);
      const chartContainer = document.getElementById('top-materias-chart');
      
      if (data.length === 0) {
        chartContainer.innerHTML = `
          <div style="text-align: center; color: var(--muted); padding: 2rem;">
            No hay datos de materias disponibles
          </div>
        `;
        return;
      }

      const maxPromedio = Math.max(...data.map(m => m.promedio_general));

      chartContainer.innerHTML = data.map((materia, index) => {
        const promedio = parseFloat(materia.promedio_general);
        const porcentaje = maxPromedio > 0 ? (promedio / maxPromedio) * 100 : 0;
        
        const getColorByRanking = (index) => {
          if (index === 0) return '#ffd700'; // Oro
          if (index === 1) return '#c0c0c0'; // Plata
          if (index === 2) return '#cd7f32'; // Bronce
          return '#22c55e'; // Verde normal
        };
        
        const getPromedioColor = (avg) => {
          if (avg >= 3.5) return '#22c55e';
          if (avg >= 2.5) return '#f59e0b';
          return '#ef4444';
        };

        return `
          <div style="padding: 0.75rem; border-bottom: 1px solid #f1f5f9; transition: background-color 0.2s ease;" 
              onmouseover="this.style.backgroundColor='#f8fafc'" 
              onmouseout="this.style.backgroundColor='transparent'">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
              <div style="
                min-width: 24px; 
                height: 24px; 
                background: ${getColorByRanking(index)}; 
                color: white; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 0.8rem; 
                font-weight: bold;
              ">
                ${index + 1}
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 500; color: var(--text); font-size: 0.9rem;">
                  ${materia.id_materia}
                </div>
                <div style="font-size: 0.8rem; color: var(--muted); line-height: 1.3; margin-top: 0.25rem;">
                  ${materia.nom_materia.length > 30 ? 
                    materia.nom_materia.substring(0, 30) + '...' : 
                    materia.nom_materia}
                </div>
                <div style="font-size: 0.7rem; color: var(--muted); margin-top: 0.25rem;">
                  ${materia.estudiantes_evaluados} estudiantes • ${materia.total_respuestas} respuestas
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 600; color: ${getPromedioColor(promedio)}; font-size: 1.1rem;">
                  ${promedio.toFixed(2)}
                </div>
                <div style="font-size: 0.7rem; color: var(--muted);">
                  ⭐ ${((promedio / 4) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            
            <!-- Barra de progreso -->
            <div style="background: #f1f5f9; height: 4px; border-radius: 2px; overflow: hidden; margin-top: 0.5rem;">
              <div style="
                background: linear-gradient(90deg, ${getPromedioColor(promedio)}, ${getColorByRanking(index)});
                height: 100%; 
                width: ${porcentaje}%; 
                transition: width 0.5s ease;
                border-radius: 2px;
              "></div>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      document.getElementById('top-materias-chart').innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 2rem;">
          Error cargando top materias
        </div>
      `;
    }
  }

  async function loadCarrerasStats() {
    try {
      const data = await api("/api/admin/reportes/carreras-stats");
      const tableBody = document.getElementById('carreras-stats-table');
      
      if (data.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 2rem; color: var(--muted);">
              No hay estadísticas de carreras disponibles
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = data.map(carrera => {
        const promedio = carrera.evaluaciones_completadas > 0 
          ? (carrera.evaluaciones_completadas / Math.max(carrera.estudiantes_activos, 1)).toFixed(1)
          : '0.0';

        return `
          <tr>
            <td><strong style="color: var(--admin-primary);">${carrera.id_carrera}</strong><br>
                <small style="color: var(--muted);">${carrera.nom_carrera}</small></td>
            <td>${carrera.coordinador || '<em>Sin asignar</em>'}</td>
            <td style="text-align: center;">${carrera.materias}</td>
            <td style="text-align: center;">${carrera.atributos}</td>
            <td style="text-align: center;">${carrera.estudiantes_activos}</td>
            <td style="text-align: center;">${carrera.evaluaciones_completadas}</td>
            <td style="text-align: center; font-weight: 600; color: var(--admin-primary);">${promedio}</td>
          </tr>
        `;
      }).join('');

    } catch (error) {
      document.getElementById('carreras-stats-table').innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--danger);">
            Error cargando estadísticas de carreras
          </td>
        </tr>
      `;
    }
  }

  async function loadAtributosList() {
    try {
      const params = selectedCarrera ? `?carrera=${selectedCarrera}` : '';
      const data = await api(`/api/admin/reportes/atributos-mas-evaluados${params}`);
      const container = document.getElementById('atributos-list');
      
      if (data.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--muted); padding: 2rem;">
            No hay atributos evaluados disponibles
          </div>
        `;
        return;
      }

      container.innerHTML = data.slice(0, 10).map((atributo, index) => {
        const promedio = parseFloat(atributo.promedio_likert || 0).toFixed(2);
        const porcentaje = Math.round((atributo.respuestas_total / Math.max(...data.map(d => d.respuestas_total))) * 100);

        return `
          <div style="padding: 0.75rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 1rem;">
            <div style="min-width: 24px; height: 24px; background: var(--admin-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">
              ${index + 1}
            </div>
            <div style="flex: 1;">
              <div style="font-weight: 500; color: var(--text);">
                AE${String(atributo.id_atributo).padStart(2, '0')}: ${atributo.nomcorto || 'Sin nombre corto'}
              </div>
              <div style="font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem;">
                ${atributo.estudiantes_evaluados} estudiantes • ${atributo.respuestas_total} respuestas
              </div>
              <div style="background: #f1f5f9; height: 4px; border-radius: 2px; margin-top: 0.5rem; overflow: hidden;">
                <div style="background: var(--admin-primary); height: 100%; width: ${porcentaje}%; transition: width 0.3s ease;"></div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 600; color: var(--admin-primary);">⭐ ${promedio}</div>
              <div style="font-size: 0.7rem; color: var(--muted);">${atributo.id_carrera}</div>
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      document.getElementById('atributos-list').innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 2rem;">
          Error cargando atributos
        </div>
      `;
    }
  }

  async function loadActividadReciente() {
    try {
      const data = await api("/api/admin/reportes/actividad-reciente?limit=15");
      const container = document.getElementById('actividad-list');
      
      if (data.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--muted); padding: 2rem;">
            No hay actividad reciente registrada
          </div>
        `;
        return;
      }

      container.innerHTML = data.map(activity => {
        const icons = {
          'evaluacion': '📝',
          'usuario': '👤',
          'sistema': '⚙️'
        };

        const timeAgo = getTimeAgo(new Date(activity.fecha));

        return `
          <div style="padding: 0.75rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: start; gap: 1rem;">
            <div style="width: 32px; height: 32px; background: #f8fafc; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${icons[activity.tipo] || '📋'}
            </div>
            <div style="flex: 1;">
              <div style="font-weight: 500; color: var(--text); line-height: 1.3;">
                ${activity.accion}
              </div>
              <div style="font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem;">
                ${activity.usuario} • ${activity.detalles}
              </div>
              <div style="font-size: 0.7rem; color: var(--muted); margin-top: 0.25rem;">
                ${timeAgo}
              </div>
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      document.getElementById('actividad-list').innerHTML = `
        <div style="text-align: center; color: var(--danger); padding: 2rem;">
          Error cargando actividad reciente
        </div>
      `;
    }
  }

  async function loadMateriasRendimiento() {
    try {
      const params = selectedCarrera ? `?carrera=${selectedCarrera}` : '';
      const data = await api(`/api/admin/reportes/rendimiento-materias${params}`);
      const tableBody = document.getElementById('materias-rendimiento-table');
      
      if (data.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 2rem; color: var(--muted);">
              No hay datos de rendimiento disponibles
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = data.map(materia => {
        const promedio = parseFloat(materia.promedio_general || 0).toFixed(2);
        const rango = `${materia.calificacion_minima}-${materia.calificacion_maxima}`;
        const porcentajeProgreso = Math.round((promedio / 4) * 100);

        const getPromedioColor = (avg) => {
          if (avg >= 3.5) return '#22c55e';
          if (avg >= 2.5) return '#f59e0b';
          return '#ef4444';
        };

        return `
          <tr>
            <td>
              <div style="font-weight: 500;">${materia.id_materia}</div>
              <div style="font-size: 0.8rem; color: var(--muted); line-height: 1.3;">${materia.nom_materia}</div>
            </td>
            <td>${materia.nom_carrera}</td>
            <td style="text-align: center;">${materia.estudiantes_evaluados}</td>
            <td style="text-align: center;">${materia.periodos_evaluados}</td>
            <td style="text-align: center;">${materia.respuestas_total}</td>
            <td style="text-align: center; font-weight: 600; color: ${getPromedioColor(promedio)};">${promedio}</td>
            <td style="text-align: center; font-size: 0.8rem; color: var(--muted);">${rango}</td>
            <td style="text-align: center;">
              <div style="width: 60px; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin: 0 auto;">
                <div style="background: ${getPromedioColor(promedio)}; height: 100%; width: ${porcentajeProgreso}%; transition: width 0.3s ease;"></div>
              </div>
              <div style="font-size: 0.7rem; color: var(--muted); margin-top: 0.25rem;">${porcentajeProgreso}%</div>
            </td>
          </tr>
        `;
      }).join('');

    } catch (error) {
      document.getElementById('materias-rendimiento-table').innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--danger);">
            Error cargando rendimiento de materias
          </td>
        </tr>
      `;
    }
  }

  // Utilidad para calcular tiempo transcurrido
  function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX');
  }

  // Función de exportación
  window.exportReport = async function(tipo) {
    try {
      const response = await fetch(`/api/admin/reportes/export/${tipo}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error en la exportación');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${tipo}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      exportModal.classList.add('hidden');
    } catch (error) {
      alert(`Error al exportar: ${error.message}`);
    }
  };

  // Cargar datos iniciales
  async function loadAllData() {
    try {
      // Cargar carreras para los filtros
      carreras = await api("/api/carreras");
      
      // Poblar todos los filtros de carrera
      const carreraOptions = '<option value="">Todas las carreras</option>' +
        carreras.map(c => `<option value="${c.id_carrera}">${c.id_carrera} - ${c.nom_carrera}</option>`).join('');
      
      filterCarrera.innerHTML = carreraOptions;
      likertFilterCarrera.innerHTML = carreraOptions;
      evolucionFilterCarrera.innerHTML = carreraOptions;
      topMateriasFilterCarrera.innerHTML = carreraOptions;

      // Cargar todos los datos
      await Promise.all([
        loadDashboardStats(),
        loadUsuariosChart(),
        loadEvaluacionesChart(),
        loadLikertDistribution(),
        loadEvolucionDesempeno(),
        loadTopMaterias(),
        loadCarrerasStats(),
        loadAtributosList(),
        loadActividadReciente(),
        loadMateriasRendimiento()
      ]);
    } catch (error) {
      console.error("Error cargando datos de reportes:", error);
    }
  }

  // Event Listeners
  filterCarrera.addEventListener('change', async () => {
    selectedCarrera = filterCarrera.value;
    await Promise.all([
      loadAtributosList(),
      loadMateriasRendimiento()
    ]);
  });

  likertFilterCarrera.addEventListener('change', async () => {
    selectedCarrera = likertFilterCarrera.value;
    await loadLikertDistribution();
  });

  evolucionFilterCarrera.addEventListener('change', async () => {
    selectedCarrera = evolucionFilterCarrera.value;
    await loadEvolucionDesempeno();
  });

  topMateriasFilterCarrera.addEventListener('change', async () => {
    selectedCarrera = topMateriasFilterCarrera.value;
    await loadTopMaterias();
  });

  refreshBtn.addEventListener('click', loadAllData);
  exportBtn.addEventListener('click', () => exportModal.classList.remove('hidden'));
  exportModalClose.addEventListener('click', () => exportModal.classList.add('hidden'));

  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) exportModal.classList.add('hidden');
  });

  // Inicialización
  await loadAllData();
}