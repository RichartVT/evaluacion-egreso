// public/coordinador/main.js
import { api } from "../assets/js/api.js";

(async function bootstrap() {
  // 1) Guard de sesión/rol
  try {
    const me = await api("/api/auth/me");
    const rol = me?.user?.rol;
    if (!me?.auth || (rol !== "COORDINADOR" && rol !== "ADMIN")) {
      window.location.href = "/coordinador/login.html";
      return; // salir temprano
    }
  } catch {
    window.location.href = "/coordinador/login.html";
    return;
  }

  // 2) Referencias de UI (después del guard para evitar nulls innecesarios)
  const coordinatorNavElement = document.getElementById("coordinator-nav");
  const viewRootElement = document.getElementById("view-root");
  const careerSelectElement = document.getElementById("career-select");
  const logoutBtnElement = document.getElementById("logout-btn");

  if (!coordinatorNavElement || !viewRootElement || !careerSelectElement) {
    console.error(
      "Faltan elementos base del panel (navbar/root/select carrera)."
    );
    return;
  }

  // 3) Estado del dashboard
  const dashboardState = {
    selectedCareerId: "ISC",
  };

  // 4) Utilidades UI
  function setActiveTab(viewName) {
    document
      .querySelectorAll("#coordinator-nav .tab")
      .forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.view === viewName)
      );
  }

  async function renderView(viewName) {
    setActiveTab(viewName);
    viewRootElement.innerHTML = ""; // limpiar
    const props = {
      root: viewRootElement,
      selectedCareerId: dashboardState.selectedCareerId,
    };

    try {
      switch (viewName) {
        case "materias": {
          const { renderCoordinatorSubjects } = await import(
            "./views/materias.js"
          );
          await renderCoordinatorSubjects(props);
          break;
        }
        case "atributos": {
          const { renderCoordinatorAttributes } = await import(
            "./views/atributos.js"
          );
          await renderCoordinatorAttributes(props);
          break;
        }
        case "criterios": {
          const { renderCoordinatorCriteria } = await import(
            "./views/criterios.js"
          );
          await renderCoordinatorCriteria(props);
          break;
        }
        case "niveles": {
          const { renderCoordinatorLevels } = await import(
            "./views/niveles.js"
          );
          await renderCoordinatorLevels(props);
          break;
        }
        default:
          viewRootElement.innerHTML = `<p style="color:#64748b">Selecciona una sección del panel.</p>`;
      }
    } catch (err) {
      console.error("No se pudo cargar la vista:", viewName, err);
      viewRootElement.innerHTML = `
        <div class="form-msg error show">No se pudo cargar la vista <b>${viewName}</b>. Revisa la consola.</div>
      `;
    }
  }

  // 5) Cargar carreras en el select
  async function loadCareersIntoSelect() {
    const careerList = await api("/api/carreras");
    if (!Array.isArray(careerList) || careerList.length === 0) {
      careerSelectElement.innerHTML = `<option value="">Sin carreras</option>`;
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
  }

  // 6) Eventos
  logoutBtnElement?.addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/coordinador/login.html";
  });

  coordinatorNavElement.addEventListener("click", (ev) => {
    const tabButton = ev.target.closest(".tab");
    if (!tabButton) return;
    ev.preventDefault(); // por si es <a>
    const viewName = tabButton.dataset.view;
    if (!viewName) return;
    renderView(viewName);
  });

  careerSelectElement.addEventListener("change", () => {
    dashboardState.selectedCareerId = careerSelectElement.value;
    const activeTab =
      document.querySelector("#coordinator-nav .tab.active")?.dataset.view ||
      "materias";
    renderView(activeTab);
  });

  // 7) Init ordenado
  await loadCareersIntoSelect();
  await renderView("materias");
})();
