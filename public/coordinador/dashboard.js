// public/coordinador/dashboard.js
import { api } from "../assets/js/api.js";

(async function bootstrap() {
  // 1) Guard de sesión/rol
  try {
    const me = await api("/api/auth/me");
    const rol = me?.user?.rol;
    if (!me?.auth || (rol !== "COORDINADOR" && rol !== "ADMIN")) {
      window.location.href = "/coordinador/login.html";
      return;
    }
  } catch {
    window.location.href = "/coordinador/login.html";
    return;
  }

  // 2) Referencias de UI
  const dashboardNavElement = document.getElementById("dashboard-nav");
  const viewRootElement = document.getElementById("view-root");
  const careerSelectElement = document.getElementById("career-select");
  const logoutBtnElement = document.getElementById("logout-btn");
  const dashboardStatsElement = document.getElementById("dashboard-stats");
  const dashboardTitleElement = document.getElementById("dashboard-title");

  if (!dashboardNavElement || !viewRootElement || !careerSelectElement) {
    console.error("Faltan elementos base del dashboard.");
    return;
  }

  // 3) Estado del dashboard
  const dashboardState = {
    selectedCareerId: "ISC",
    currentView: "materias",
    stats: {
      materias: 0,
      atributos: 0,
      criterios: 0,
      completitud: 0
    }
  };

  // 4) Cargar estadísticas
  async function loadDashboardStats() {
    if (!dashboardState.selectedCareerId) return;

    try {
      // Cargar datos de estadísticas
      const [materiasData, atributosData, criteriosData] = await Promise.all([
        api(`/api/materias?carrera=${encodeURIComponent(dashboardState.selectedCareerId)}`),
        api(`/api/atributos?carrera=${encodeURIComponent(dashboardState.selectedCareerId)}`),
        api(`/api/criterios?carrera=${encodeURIComponent(dashboardState.selectedCareerId)}`)
      ]);

      // Calcular métricas
      const materiasActivas = materiasData.length;
      const atributosEgreso = atributosData.length;
      const criteriosDefinidos = criteriosData.length;
      
      // Calcular completitud (porcentaje de atributos con criterios)
      const atributosConCriterios = new Set(criteriosData.map(c => c.id_atributo)).size;
      const completitud = atributosEgreso > 0 ? Math.round((atributosConCriterios / atributosEgreso) * 100) : 0;

      // Actualizar estado
      dashboardState.stats = {
        materias: materiasActivas,
        atributos: atributosEgreso,
        criterios: criteriosDefinidos,
        completitud: completitud
      };

      // Actualizar UI
      updateStatsDisplay();

    } catch (error) {
      console.error("Error cargando estadísticas:", error);
      // Mostrar valores por defecto en caso de error
      dashboardState.stats = { materias: 0, atributos: 0, criterios: 0, completitud: 0 };
      updateStatsDisplay();
    }
  }

  // 5) Actualizar display de estadísticas
  function updateStatsDisplay() {
    const statCards = dashboardStatsElement.querySelectorAll('.stat-card');
    const stats = [
      { value: dashboardState.stats.materias, label: "Materias activas" },
      { value: dashboardState.stats.atributos, label: "Atributos de egreso" },
      { value: dashboardState.stats.criterios, label: "Criterios definidos" },
      { value: `${dashboardState.stats.completitud}%`, label: "Completitud" }
    ];

    statCards.forEach((card, index) => {
      const stat = stats[index];
      if (stat) {
        card.classList.remove('loading');
        card.querySelector('.stat-value').innerHTML = stat.value;
        card.querySelector('.stat-label').textContent = stat.label;
        
        // Animación de conteo para números
        if (typeof stat.value === 'number') {
          animateCounter(card.querySelector('.stat-value'), stat.value);
        }
      }
    });
  }

  // 6) Animación de conteo
  function animateCounter(element, target) {
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(progress * target);
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    }
    
    requestAnimationFrame(updateCounter);
  }

  // 7) Utilidades UI
  function setActiveNavCard(viewName) {
    document
      .querySelectorAll("#dashboard-nav .nav-card")
      .forEach((card) =>
        card.classList.toggle("active", card.dataset.view === viewName)
      );
  }

  async function renderView(viewName) {
    dashboardState.currentView = viewName;
    setActiveNavCard(viewName);
    viewRootElement.innerHTML = ""; // limpiar

    const props = {
      root: viewRootElement,
      selectedCareerId: dashboardState.selectedCareerId,
    };

    try {
      switch (viewName) {
        case "materias": {
          const { renderCoordinatorSubjects } = await import("./views/materias.js");
          await renderCoordinatorSubjects(props);
          break;
        }
        case "atributos": {
          const { renderCoordinatorAttributes } = await import("./views/atributos.js");
          await renderCoordinatorAttributes(props);
          break;
        }
        case "criterios": {
          const { renderCoordinatorCriteria } = await import("./views/criterios.js");
          await renderCoordinatorCriteria(props);
          break;
        }
        case "niveles": {
          const { renderCoordinatorLevels } = await import("./views/niveles.js");
          await renderCoordinatorLevels(props);
          break;
        }
        case "reportes": {
            const { renderCoordinatorReports } = await import("./views/reportes.js");
            await renderCoordinatorReports(props);
            break;
        }
        case "configuracion": {
          viewRootElement.innerHTML = `
            <div style="padding: 3rem 2rem; text-align: center;">
              <h2 style="color: var(--gray-800); margin-bottom: 1rem;">⚙️ Configuración</h2>
              <p style="color: var(--gray-600);">Ajustes y preferencias del sistema estarán disponibles aquí.</p>
            </div>
          `;
          break;
        }
        default:
          viewRootElement.innerHTML = `
            <div class="welcome-message">
              <h2>Selecciona una sección</h2>
              <p>Elige una opción del panel de navegación para comenzar.</p>
            </div>
          `;
      }

      // Actualizar estadísticas después de cambiar de vista
      await loadDashboardStats();

    } catch (err) {
      console.error("No se pudo cargar la vista:", viewName, err);
      viewRootElement.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <div style="color: #ef4444; font-weight: 600;">No se pudo cargar la vista "${viewName}"</div>
          <p style="color: var(--gray-600); margin: 0.5rem 0;">Revisa la consola para más detalles.</p>
          <button onclick="location.reload()" style="margin-top: 1rem;" class="dashboard-btn primary">Reintentar</button>
        </div>
      `;
    }
  }

  // 8) Cargar carreras en el select
  async function loadCareersIntoSelect() {
    try {
      const careerList = await api("/api/carreras");
      if (!Array.isArray(careerList) || careerList.length === 0) {
        careerSelectElement.innerHTML = `<option value="">Sin carreras disponibles</option>`;
        dashboardState.selectedCareerId = "";
        return;
      }

      careerSelectElement.innerHTML = careerList
        .map(
          (c) =>
            `<option value="${c.id_carrera}">${c.id_carrera} — ${c.nom_carrera}</option>`
        )
        .join("");

      const defaultCareer =
        careerList.find((c) => c.id_carrera === "ISC")?.id_carrera ||
        careerList[0]?.id_carrera;

      dashboardState.selectedCareerId = defaultCareer || "";
      careerSelectElement.value = dashboardState.selectedCareerId;

      // Actualizar título con la carrera seleccionada
      updateDashboardTitle();
    } catch (error) {
      console.error("Error cargando carreras:", error);
      careerSelectElement.innerHTML = `<option value="">Error cargando carreras</option>`;
    }
  }

  // 9) Actualizar título del dashboard
  function updateDashboardTitle() {
    const selectedOption = careerSelectElement.options[careerSelectElement.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const careerName = selectedOption.text.split(' — ')[0];
      dashboardTitleElement.textContent = `Panel del Coordinador • ${careerName}`;
    } else {
      dashboardTitleElement.textContent = "Panel del Coordinador";
    }
  }

  // 10) Eventos
  logoutBtnElement?.addEventListener("click", async () => {
    if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      try {
        await api("/api/auth/logout", { method: "POST" });
        window.location.href = "/coordinador/login.html";
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        window.location.href = "/coordinador/login.html";
      }
    }
  });

  dashboardNavElement.addEventListener("click", (ev) => {
    const navCard = ev.target.closest(".nav-card");
    if (!navCard) return;
    ev.preventDefault();
    const viewName = navCard.dataset.view;
    if (!viewName) return;
    renderView(viewName);
  });

  careerSelectElement.addEventListener("change", () => {
    dashboardState.selectedCareerId = careerSelectElement.value;
    updateDashboardTitle();
    
    // Recargar estadísticas y vista actual
    loadDashboardStats();
    
    // Solo recargar vista si no está en la página de bienvenida
    if (dashboardState.currentView && dashboardState.currentView !== "welcome") {
      renderView(dashboardState.currentView);
    }
  });

  // Eventos adicionales para botones del header
  document.getElementById("export-btn")?.addEventListener("click", () => {
    alert("Funcionalidad de exportación estará disponible próximamente");
  });

  document.getElementById("new-btn")?.addEventListener("click", () => {
    // Redirigir a la vista de materias para crear nuevo elemento
    renderView("materias");
    // Simular click en botón de nueva materia si existe
    setTimeout(() => {
      const newBtn = document.querySelector("#add-materia-btn");
      if (newBtn) {
        newBtn.click();
      }
    }, 1000);
  });

  // 11) Inicialización
  console.log("🚀 Iniciando Dashboard del Coordinador...");
  
  // Cargar datos iniciales
  await loadCareersIntoSelect();
  await loadDashboardStats();
  
  // Renderizar vista inicial
  await renderView("materias");
  
  console.log("✅ Dashboard cargado correctamente");

  // 12) Función para refrescar estadísticas (puede ser llamada desde otras vistas)
  window.refreshDashboardStats = loadDashboardStats;
})();