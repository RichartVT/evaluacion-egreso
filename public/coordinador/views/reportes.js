// public/coordinador/views/reportes.js
import { api } from "../../assets/js/api.js";

export async function renderCoordinatorReports({ root, selectedCareerId }) {
  root.innerHTML = `
    <style>
      .reports-container {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .reports-header {
        margin-bottom: 2rem;
      }
      
      .reports-title {
        color: var(--gray-800);
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
      }
      
      .reports-subtitle {
        color: var(--gray-600);
        margin: 0;
      }
      
      .reports-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 2rem;
        margin-bottom: 2rem;
      }
      
      .report-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        border: 1px solid var(--gray-200);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .report-card-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      
      .report-icon {
        width: 32px;
        height: 32px;
        background: var(--primary-green);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.2rem;
      }
      
      .report-card-title {
        color: var(--gray-800);
        font-weight: 600;
        margin: 0;
        flex: 1;
      }
      
      .report-card-content {
        margin-bottom: 1rem;
      }
      
      .metric-item {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--gray-100);
      }
      
      .metric-item:last-child {
        border-bottom: none;
      }
      
      .metric-label {
        color: var(--gray-600);
        font-size: 0.875rem;
      }
      
      .metric-value {
        color: var(--gray-800);
        font-weight: 600;
      }
      
      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--gray-200);
        border-radius: 4px;
        overflow: hidden;
        margin: 0.5rem 0;
      }
      
      .progress-fill {
        height: 100%;
        background: var(--primary-green);
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      
      .summary-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--gray-200);
      }
      
      .summary-table th {
        background: var(--gray-50);
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        color: var(--gray-700);
        border-bottom: 1px solid var(--gray-200);
      }
      
      .summary-table td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--gray-100);
        color: var(--gray-600);
      }
      
      .summary-table tbody tr:hover {
        background: var(--gray-50);
      }
      
      .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      
      .status-complete {
        background: #dcfce7;
        color: #166534;
      }
      
      .status-partial {
        background: #fef3c7;
        color: #92400e;
      }
      
      .status-empty {
        background: #fee2e2;
        color: #991b1b;
      }
      
      .loading-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--gray-500);
      }
      
      .export-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
      }
      
      .btn-export {
        padding: 0.5rem 1rem;
        background: var(--gray-100);
        border: 1px solid var(--gray-300);
        border-radius: 8px;
        color: var(--gray-700);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .btn-export:hover {
        background: var(--gray-200);
      }
      
      .btn-export.primary {
        background: var(--primary-green);
        border-color: var(--primary-green);
        color: white;
      }
      
      .btn-export.primary:hover {
        background: var(--primary-green-hover);
      }
      
      @media (max-width: 768px) {
        .reports-container {
          padding: 1rem;
        }
        
        .reports-grid {
          grid-template-columns: 1fr;
        }
        
        .export-actions {
          flex-direction: column;
        }
      }
    </style>
    
    <div class="reports-container">
      <div class="reports-header">
        <h1 class="reports-title">📊 Reportes y Análisis</h1>
        <p class="reports-subtitle">Métricas y evaluaciones para ${selectedCareerId}</p>
      </div>
      
      <div class="reports-grid">
        <div class="report-card">
          <div class="report-card-header">
            <div class="report-icon">📚</div>
            <h3 class="report-card-title">Materias y Mapeos</h3>
          </div>
          <div class="report-card-content" id="materias-report">
            <div class="loading-placeholder">Cargando...</div>
          </div>
        </div>
        
        <div class="report-card">
          <div class="report-card-header">
            <div class="report-icon">🎯</div>
            <h3 class="report-card-title">Atributos de Egreso</h3>
          </div>
          <div class="report-card-content" id="atributos-report">
            <div class="loading-placeholder">Cargando...</div>
          </div>
        </div>
        
        <div class="report-card">
          <div class="report-card-header">
            <div class="report-icon">📋</div>
            <h3 class="report-card-title">Criterios de Evaluación</h3>
          </div>
          <div class="report-card-content" id="criterios-report">
            <div class="loading-placeholder">Cargando...</div>
          </div>
        </div>
        
        <div class="report-card">
          <div class="report-card-header">
            <div class="report-icon">📈</div>
            <h3 class="report-card-title">Estado General</h3>
          </div>
          <div class="report-card-content" id="general-report">
            <div class="loading-placeholder">Cargando...</div>
          </div>
        </div>
      </div>
      
      <!-- Tabla resumen -->
      <div style="margin-top: 2rem;">
        <h3 style="color: var(--gray-800); margin-bottom: 1rem;">Resumen por Atributo de Egreso</h3>
        <table class="summary-table" id="summary-table">
          <thead>
            <tr>
              <th>Atributo</th>
              <th>Nombre</th>
              <th>Criterios</th>
              <th>Materias Asignadas</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody id="summary-tbody">
            <tr>
              <td colspan="5" class="loading-placeholder">Cargando resumen...</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Acciones de exportación -->
      <div class="export-actions">
        <button class="btn-export primary" onclick="exportReportData('all')">
          📄 Exportar Reporte Completo
        </button>
        <button class="btn-export" onclick="exportReportData('summary')">
          📋 Exportar Resumen
        </button>
        <button class="btn-export" onclick="printReport()">
          🖨️ Imprimir Reporte
        </button>
      </div>
    </div>
  `;

  // Cargar datos de reportes
  await loadReportsData();

  // Funciones para cargar datos
  async function loadReportsData() {
    try {
      const [materiasData, atributosData, criteriosData, nivelesData] = await Promise.all([
        api(`/api/materias?carrera=${encodeURIComponent(selectedCareerId)}`),
        api(`/api/atributos?carrera=${encodeURIComponent(selectedCareerId)}`),
        api(`/api/criterios?carrera=${encodeURIComponent(selectedCareerId)}`),
        // Para obtener los mapeos de todas las materias
        loadAllMappings()
      ]);

      // Renderizar cada reporte
      renderMateriasReport(materiasData, nivelesData);
      renderAtributosReport(atributosData, criteriosData);
      renderCriteriosReport(criteriosData);
      renderGeneralReport(materiasData, atributosData, criteriosData, nivelesData);
      renderSummaryTable(atributosData, criteriosData, nivelesData);

    } catch (error) {
      console.error("Error cargando reportes:", error);
      showErrorMessage("Error cargando datos de reportes");
    }
  }

  async function loadAllMappings() {
    try {
      const materias = await api(`/api/materias?carrera=${encodeURIComponent(selectedCareerId)}`);
      const allMappings = [];
      
      for (const materia of materias) {
        try {
          const mappings = await api(`/api/niveles-materia?carrera=${encodeURIComponent(selectedCareerId)}&materia=${encodeURIComponent(materia.id_materia)}`);
          allMappings.push(...mappings.map(m => ({ ...m, id_materia: materia.id_materia, nom_materia: materia.nom_materia })));
        } catch (e) {
          // Ignorar errores de materias individuales
        }
      }
      
      return allMappings;
    } catch (error) {
      console.error("Error cargando mapeos:", error);
      return [];
    }
  }

  function renderMateriasReport(materias, mappings) {
    const materiasConMapeo = new Set(mappings.map(m => m.id_materia)).size;
    const porcentajeMapeo = materias.length > 0 ? Math.round((materiasConMapeo / materias.length) * 100) : 0;
    
    document.getElementById('materias-report').innerHTML = `
      <div class="metric-item">
        <span class="metric-label">Total de materias</span>
        <span class="metric-value">${materias.length}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Con AE asignados</span>
        <span class="metric-value">${materiasConMapeo}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Sin asignar</span>
        <span class="metric-value">${materias.length - materiasConMapeo}</span>
      </div>
      <div style="margin-top: 0.75rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.25rem;">
          <span>Cobertura de mapeo</span>
          <span>${porcentajeMapeo}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${porcentajeMapeo}%"></div>
        </div>
      </div>
    `;
  }

  function renderAtributosReport(atributos, criterios) {
    const atributosConCriterios = new Set(criterios.map(c => c.id_atributo)).size;
    const porcentajeCompleto = atributos.length > 0 ? Math.round((atributosConCriterios / atributos.length) * 100) : 0;
    
    document.getElementById('atributos-report').innerHTML = `
      <div class="metric-item">
        <span class="metric-label">Total de AE</span>
        <span class="metric-value">${atributos.length}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Con criterios</span>
        <span class="metric-value">${atributosConCriterios}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Sin criterios</span>
        <span class="metric-value">${atributos.length - atributosConCriterios}</span>
      </div>
      <div style="margin-top: 0.75rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.25rem;">
          <span>Completitud</span>
          <span>${porcentajeCompleto}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${porcentajeCompleto}%"></div>
        </div>
      </div>
    `;
  }

  function renderCriteriosReport(criterios) {
    const criteriosPorAtributo = {};
    criterios.forEach(c => {
      criteriosPorAtributo[c.id_atributo] = (criteriosPorAtributo[c.id_atributo] || 0) + 1;
    });
    
    const promedioCriterios = Object.keys(criteriosPorAtributo).length > 0 
      ? (criterios.length / Object.keys(criteriosPorAtributo).length).toFixed(1)
      : 0;
    
    document.getElementById('criterios-report').innerHTML = `
      <div class="metric-item">
        <span class="metric-label">Total criterios</span>
        <span class="metric-value">${criterios.length}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">AE con criterios</span>
        <span class="metric-value">${Object.keys(criteriosPorAtributo).length}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Promedio por AE</span>
        <span class="metric-value">${promedioCriterios}</span>
      </div>
    `;
  }

  function renderGeneralReport(materias, atributos, criterios, mappings) {
    const totalElementos = materias.length + atributos.length + criterios.length;
    const elementosCompletos = new Set(mappings.map(m => m.id_materia)).size + 
                              new Set(criterios.map(c => c.id_atributo)).size + 
                              criterios.length;
    const saludGeneral = totalElementos > 0 ? Math.round((elementosCompletos / (totalElementos * 2)) * 100) : 0;
    
    document.getElementById('general-report').innerHTML = `
      <div class="metric-item">
        <span class="metric-label">Salud del sistema</span>
        <span class="metric-value">${saludGeneral}%</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Elementos activos</span>
        <span class="metric-value">${totalElementos}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Última actualización</span>
        <span class="metric-value">${new Date().toLocaleDateString()}</span>
      </div>
      <div style="margin-top: 0.75rem;">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${saludGeneral}%"></div>
        </div>
      </div>
    `;
  }

  function renderSummaryTable(atributos, criterios, mappings) {
    const criteriosPorAtributo = {};
    criterios.forEach(c => {
      criteriosPorAtributo[c.id_atributo] = (criteriosPorAtributo[c.id_atributo] || 0) + 1;
    });
    
    const materiasPorAtributo = {};
    mappings.forEach(m => {
      materiasPorAtributo[m.id_atributo] = (materiasPorAtributo[m.id_atributo] || 0) + 1;
    });
    
    const tbody = document.getElementById('summary-tbody');
    tbody.innerHTML = atributos.map(attr => {
      const criteriosCount = criteriosPorAtributo[attr.id_atributo] || 0;
      const materiasCount = materiasPorAtributo[attr.id_atributo] || 0;
      
      let status = 'status-empty';
      let statusText = 'Incompleto';
      
      if (criteriosCount > 0 && materiasCount > 0) {
        status = 'status-complete';
        statusText = 'Completo';
      } else if (criteriosCount > 0 || materiasCount > 0) {
        status = 'status-partial';
        statusText = 'Parcial';
      }
      
      return `
        <tr>
          <td>AE${String(attr.id_atributo).padStart(2, '0')}</td>
          <td>${attr.nomcorto || attr.nom_atributo}</td>
          <td>${criteriosCount}</td>
          <td>${materiasCount}</td>
          <td><span class="status-badge ${status}">${statusText}</span></td>
        </tr>
      `;
    }).join('');
  }

  function showErrorMessage(message) {
    const reportCards = document.querySelectorAll('.report-card-content');
    reportCards.forEach(card => {
      card.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 1rem;">${message}</div>`;
    });
  }

  // Funciones globales para exportar
  window.exportReportData = function(type) {
    if (type === 'all') {
      alert('Exportación completa estará disponible próximamente');
    } else if (type === 'summary') {
      exportSummaryCSV();
    }
  };

  window.printReport = function() {
    window.print();
  };

  function exportSummaryCSV() {
    const table = document.getElementById('summary-table');
    let csv = '';
    
    // Headers
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
    csv += headers.join(',') + '\\n';
    
    // Rows
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td')).map(td => {
        return '"' + td.textContent.replace(/"/g, '""') + '"';
      });
      csv += cells.join(',') + '\\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${selectedCareerId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}