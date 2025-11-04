import { api } from "../assets/js/api.js";

// elementos base
const coordinatorNavElement = document.getElementById("coordinator-nav");
const viewRootElement = document.getElementById("view-root");
const careerSelectElement = document.getElementById("career-select");

// estado global mínimo del panel
const dashboardState = {
  selectedCareerId: "ISC", // por defecto; se fija al cargar carreras
};

// cargar carreras en el select (una vez)
async function loadCareersIntoSelect() {
  const careerList = await api("/api/carreras");
  careerSelectElement.innerHTML = careerList
    .map(
      (c) =>
        `<option value="${c.id_carrera}">${c.id_carrera} — ${c.nom_carrera}</option>`
    )
    .join("");
  // si existe ISC, selecciónalo; si no, toma el primero
  const defaultCareer =
    careerList.find((c) => c.id_carrera === "ISC")?.id_carrera ||
    careerList[0]?.id_carrera;
  dashboardState.selectedCareerId = defaultCareer || "ISC";
  careerSelectElement.value = dashboardState.selectedCareerId;
}

// router: carga la vista pedida
async function renderView(viewName) {
  // marcar tab activa
  document
    .querySelectorAll(".nav .tab")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === viewName));

  viewRootElement.innerHTML = ""; // limpiar
  const props = {
    root: viewRootElement,
    selectedCareerId: dashboardState.selectedCareerId,
  };

  // lazy import para no cargar todo de golpe
  if (viewName === "materias") {
    const { renderCoordinatorSubjects } = await import("./views/materias.js");
    return renderCoordinatorSubjects(props);
  }
  if (viewName === "atributos") {
    const { renderCoordinatorAttributes } = await import(
      "./views/atributos.js"
    );
    return renderCoordinatorAttributes(props);
  }
  if (viewName === "criterios") {
    const { renderCoordinatorCriteria } = await import("./views/criterios.js");
    return renderCoordinatorCriteria(props);
  }

  if (viewName === "niveles") {
    const { renderCoordinatorLevels } = await import("./views/niveles.js");
    return renderCoordinatorLevels(props);
  }
}

// eventos
coordinatorNavElement.addEventListener("click", (ev) => {
  const tabButton = ev.target.closest(".tab");
  if (!tabButton) return;
  renderView(tabButton.dataset.view);
});
careerSelectElement.addEventListener("change", () => {
  dashboardState.selectedCareerId = careerSelectElement.value;
  // recargar la vista actual con la nueva carrera
  const activeTab =
    document.querySelector(".nav .tab.active")?.dataset.view || "materias";
  renderView(activeTab);
});

// init
await loadCareersIntoSelect();
await renderView("materias");
