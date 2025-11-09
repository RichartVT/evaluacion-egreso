// public/admin/main.js
import { api } from "../assets/js/api.js";

(async function bootstrap() {
  // 1) Guard de sesión/rol - Solo ADMIN puede acceder
  try {
    const me = await api("/api/auth/me");
    const rol = me?.user?.rol;
    if (!me?.auth || rol !== "ADMIN") {
      window.location.href = "/admin/login.html";
      return;
    }
    console.log("Admin autenticado:", me.user.email);
  } catch {
    window.location.href = "/admin/login.html";
    return;
  }

  // 2) Referencias de UI
  const adminNavElement = document.getElementById("admin-nav");
  const viewRootElement = document.getElementById("view-root");
  const logoutBtnElement = document.getElementById("logout-btn");

  if (!adminNavElement || !viewRootElement || !logoutBtnElement) {
    console.error("Faltan elementos base del panel de administración.");
    return;
  }

  // 3) Estado global del admin
  const adminState = {
    currentView: "dashboard",
    loadedViews: new Map(), // Cache de vistas ya cargadas
    stats: {
      usuarios: 0,
      carreras: 0,
      estudiantes: 0,
      evaluaciones: 0,
    },
  };

  // 4) Utilidades UI
  function setActiveTab(viewName) {
    document
      .querySelectorAll(".admin-tab")
      .forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.view === viewName)
      );
  }

  function showLoading() {
    viewRootElement.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 400px; flex-direction: column; gap: 1rem;">
        <div class="spinner"></div>
        <p style="color: var(--muted);">Cargando...</p>
      </div>
    `;
  }

  function showError(message, details = null) {
    viewRootElement.innerHTML = `
      <div class="admin-section">
        <div class="form-msg error show">
          <strong>Error:</strong> ${message}
          ${details ? `<br><small>${details}</small>` : ""}
        </div>
        <button class="btn btn-admin-primary" onclick="location.reload()" style="margin-top: 1rem;">
          Reintentar
        </button>
      </div>
    `;
  }

  // 5) Sistema de renderizado de vistas
  async function renderView(viewName) {
    setActiveTab(viewName);
    adminState.currentView = viewName;

    // Mostrar loading inmediatamente
    showLoading();

    try {
      switch (viewName) {
        case "dashboard":
          await renderDashboard();
          break;
        case "usuarios":
          const { renderAdminUsers } = await import("./views/usuarios.js");
          await renderAdminUsers({ root: viewRootElement });
          break;
        case "carreras":
          const { renderAdminCarreras } = await import("./views/carreras.js");
          await renderAdminCarreras({ root: viewRootElement });
          break;
        case "estudiantes":
          const { renderAdminEstudiantes } = await import(
            "./views/estudiantes.js"
          );
          await renderAdminEstudiantes({ root: viewRootElement });
          break;
        case "reportes":
          await renderReportes();
          break;
        case "sistema":
          await renderSistema();
          break;
        default:
          showError(
            "Vista no encontrada",
            `La vista '${viewName}' no está implementada.`
          );
      }
    } catch (err) {
      console.error("Error cargando vista:", viewName, err);
      showError(
        `No se pudo cargar la vista ${viewName}`,
        err.message || "Revisa la consola para más detalles"
      );
    }
  }

  // 6) Vista de Dashboard
  async function renderDashboard() {
    try {
      // Cargar estadísticas
      await loadStats();

      viewRootElement.innerHTML = `
        <div class="admin-section">
          <div class="admin-section-header">
            <h2 class="admin-section-title">Dashboard General</h2>
            <div>
              <span style="color: var(--muted); font-size: 0.9rem;">
                Última actualización: ${new Date().toLocaleString()}
              </span>
            </div>
          </div>

          <div class="dashboard-stats">
            <div class="stat-card">
              <div class="stat-number" id="stat-usuarios">${
                adminState.stats.usuarios
              }</div>
              <div class="stat-label">Total Usuarios</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" id="stat-carreras">${
                adminState.stats.carreras
              }</div>
              <div class="stat-label">Carreras Activas</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" id="stat-estudiantes">${
                adminState.stats.estudiantes
              }</div>
              <div class="stat-label">Estudiantes Registrados</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" id="stat-evaluaciones">${
                adminState.stats.evaluaciones
              }</div>
              <div class="stat-label">Evaluaciones Completadas</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; margin-top: 2rem;">
            <div>
              <h3 style="margin-bottom: 1rem;">Actividad Reciente</h3>
              <div class="activity-feed" id="activity-feed">
                <div style="padding: 2rem; text-align: center; color: var(--muted);">
                  Cargando actividad...
                </div>
              </div>
            </div>
            <div>
              <h3 style="margin-bottom: 1rem;">Acciones Rápidas</h3>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <button class="btn btn-admin-primary" onclick="quickAction('usuarios')">
                  👥 Gestionar Usuarios
                </button>
                <button class="btn btn-admin-primary" onclick="quickAction('carreras')">
                  🎓 Administrar Carreras
                </button>
                <button class="btn btn-admin-primary" onclick="quickAction('estudiantes')">
                  📊 Importar Estudiantes
                </button>
                <button class="btn btn-outline" onclick="refreshStats()">
                  🔄 Actualizar Estadísticas
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Cargar actividad reciente
      await loadRecentActivity();
    } catch (error) {
      showError("Error cargando dashboard", error.message);
    }
  }

  // 7) Cargar estadísticas del sistema
  async function loadStats() {
    try {
      const [usuarios, carreras] = await Promise.all([
        api("/api/admin/usuarios"),
        api("/api/admin/carreras"),
      ]);

      adminState.stats.usuarios = usuarios.length;
      adminState.stats.carreras = carreras.length;

      // Calcular estudiantes (usuarios con rol ALUMNO)
      adminState.stats.estudiantes = usuarios.filter(
        (u) => u.rol_clave === "ALUMNO"
      ).length;

      // Por ahora simulamos evaluaciones - después conectar con API real
      adminState.stats.evaluaciones = Math.floor(
        adminState.stats.estudiantes * 8.5
      );
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
      // Usar valores por defecto si hay error
      adminState.stats = {
        usuarios: 0,
        carreras: 0,
        estudiantes: 0,
        evaluaciones: 0,
      };
    }
  }

  // 8) Cargar actividad reciente (simulada por ahora)
  async function loadRecentActivity() {
    const activityFeed = document.getElementById("activity-feed");
    if (!activityFeed) return;

    try {
      // Simular actividad reciente - después conectar con API real
      const activities = [
        {
          type: "create",
          user: "admin@itcelaya.mx",
          action: "creó usuario",
          details: "coord.iq@itcelaya.mx",
          time: "2025-11-08 14:30",
        },
        {
          type: "edit",
          user: "coord.isc@itcelaya.mx",
          action: "modificó criterio",
          details: "AE03 - Criterio 2",
          time: "2025-11-08 14:15",
        },
        {
          type: "create",
          user: "admin@itcelaya.mx",
          action: "agregó carrera",
          details: "Ing. Gestión Empresarial",
          time: "2025-11-08 13:45",
        },
        {
          type: "delete",
          user: "coord.isc@itcelaya.mx",
          action: "eliminó materia",
          details: "MAT-001 (sin atributos)",
          time: "2025-11-08 12:20",
        },
      ];

      const getActivityIcon = (type) => {
        switch (type) {
          case "create":
            return "✅";
          case "edit":
            return "✏️";
          case "delete":
            return "🗑️";
          default:
            return "ℹ️";
        }
      };

      activityFeed.innerHTML = activities
        .map(
          (activity) => `
        <div class="activity-item">
          <div class="activity-icon ${activity.type}">
            ${getActivityIcon(activity.type)}
          </div>
          <div class="activity-content">
            <div class="activity-user">${activity.user}</div>
            <div class="activity-action">${activity.action}: ${
            activity.details
          }</div>
            <div class="activity-time">${activity.time}</div>
          </div>
        </div>
      `
        )
        .join("");
    } catch (error) {
      activityFeed.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--muted);">
          Error cargando actividad reciente
        </div>
      `;
    }
  }

  // 9) Vistas placeholder (implementar después)
  async function renderReportes() {
    viewRootElement.innerHTML = `
    <div class="admin-section">
      <div class="admin-section-header">
        <h2 class="admin-section-title">Reportes del Sistema</h2>
      </div>
      <div style="text-align: center; padding: 3rem; color: var(--muted);">
        <h3>📈 Módulo de Reportes</h3>
        <p>Esta funcionalidad estará disponible próximamente.</p>
        <p>Incluirá gráficos de progreso, estadísticas por carrera y exportación de datos.</p>
      </div>
    </div>
  `;
  }

  // Por esta nueva función:
  async function renderReportes() {
    const { renderAdminReportes } = await import("./views/reportes.js");
    await renderAdminReportes({ root: viewRootElement });
  }

  async function renderSistema() {
    viewRootElement.innerHTML = `
      <div class="admin-section">
        <div class="admin-section-header">
          <h2 class="admin-section-title">Administración del Sistema</h2>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
          <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
            <h4>⚙️ Configuración Global</h4>
            <p style="color: var(--muted); margin-bottom: 1rem;">Parámetros del sistema y períodos académicos.</p>
            <button class="btn btn-outline" disabled>Próximamente</button>
          </div>
          <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
            <h4>📋 Logs del Sistema</h4>
            <p style="color: var(--muted); margin-bottom: 1rem;">Auditoría de actividades y eventos importantes.</p>
            <button class="btn btn-outline" disabled>Próximamente</button>
          </div>
          <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
            <h4>💾 Respaldos</h4>
            <p style="color: var(--muted); margin-bottom: 1rem;">Exportar e importar configuraciones del sistema.</p>
            <button class="btn btn-outline" disabled>Próximamente</button>
          </div>
          <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
            <h4>🧹 Mantenimiento</h4>
            <p style="color: var(--muted); margin-bottom: 1rem;">Limpieza de datos obsoletos y optimización.</p>
            <button class="btn btn-outline" disabled>Próximamente</button>
          </div>
        </div>
      </div>
    `;
  }

  // 10) Funciones globales para eventos
  window.quickAction = function (viewName) {
    renderView(viewName);
  };

  window.refreshStats = async function () {
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = "🔄 Actualizando...";
    button.disabled = true;

    try {
      await loadStats();
      // Actualizar números en la vista si está en dashboard
      if (adminState.currentView === "dashboard") {
        document.getElementById("stat-usuarios").textContent =
          adminState.stats.usuarios;
        document.getElementById("stat-carreras").textContent =
          adminState.stats.carreras;
        document.getElementById("stat-estudiantes").textContent =
          adminState.stats.estudiantes;
        document.getElementById("stat-evaluaciones").textContent =
          adminState.stats.evaluaciones;
      }
    } catch (error) {
      console.error("Error actualizando estadísticas:", error);
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  };

  // 11) Eventos principales
  logoutBtnElement.addEventListener("click", async () => {
    if (confirm("¿Cerrar sesión de administrador?")) {
      try {
        await api("/api/auth/logout", { method: "POST" });
        window.location.href = "/coordinador/login.html";
      } catch (error) {
        console.error("Error en logout:", error);
        window.location.href = "/coordinador/login.html";
      }
    }
  });

  adminNavElement.addEventListener("click", (ev) => {
    const tabButton = ev.target.closest(".admin-tab");
    if (!tabButton) return;
    ev.preventDefault();
    const viewName = tabButton.dataset.view;
    if (!viewName || viewName === adminState.currentView) return;
    renderView(viewName);
  });

  // 12) Modal de confirmación global
  const confirmModal = document.getElementById("confirm-modal");
  const confirmCancel = document.getElementById("confirm-cancel");
  const confirmOk = document.getElementById("confirm-ok");

  window.openConfirmModal = function ({
    title,
    content,
    onConfirm,
    okText = "Confirmar",
    okVariant = "danger",
  }) {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-content").innerHTML = content;

    const okButton = document.getElementById("confirm-ok");
    okButton.textContent = okText;
    okButton.className = `btn ${
      okVariant === "danger" ? "btn-danger" : "btn-admin-primary"
    }`;

    // Limpiar eventos anteriores
    const newOkButton = okButton.cloneNode(true);
    okButton.parentNode.replaceChild(newOkButton, okButton);

    newOkButton.addEventListener("click", async () => {
      newOkButton.disabled = true;
      try {
        await onConfirm?.();
      } finally {
        confirmModal.classList.add("hidden");
        newOkButton.disabled = false;
      }
    });

    confirmModal.classList.remove("hidden");
  };

  confirmCancel.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
  });

  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) {
      confirmModal.classList.add("hidden");
    }
  });

  // 13) Inicialización
  console.log("Admin panel inicializado");
  await renderView("dashboard");
})();
