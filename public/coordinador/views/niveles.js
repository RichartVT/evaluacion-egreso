// public/coordinador/views/niveles.js
import { api } from "../../assets/js/api.js";
import { openConfirmModal } from "../helpers/modal-util.js";

export async function renderCoordinatorLevels({ root, selectedCareerId }) {
  // Carga inicial de materias y atributos de la carrera
  const subjectList = await api(
    `/api/materias?carrera=${encodeURIComponent(selectedCareerId)}`
  );
  const attributeList = await api(
    `/api/atributos?carrera=${encodeURIComponent(selectedCareerId)}`
  );

  // UI
  root.innerHTML = `
    <section>
      <h2>Niveles por Materia</h2>

      <div class="row" style="margin:.5rem 0 1rem">
        <label>Materia
          <select id="subject-select">
            <option value="">Selecciona una materia…</option>
            ${subjectList
              .map(
                (s) =>
                  `<option value="${s.id_materia}">${s.id_materia} — ${s.nom_materia}</option>`
              )
              .join("")}
          </select>
        </label>
      </div>

      <form id="map-form" class="row" style="margin:.25rem 0 1rem">
        <label>Atributo
          <select id="attribute-select" ${
            attributeList.length === 0 ? "disabled" : ""
          }>
            ${
              attributeList.length === 0
                ? '<option value="">Sin atributos — agrega primero</option>'
                : attributeList
                    .map(
                      (a) =>
                        `<option value="${a.id_atributo}">${a.id_atributo} — ${
                          a.nomcorto || a.nom_atributo
                        }</option>`
                    )
                    .join("")
            }
          </select>
        </label>
        <label>Nivel
          <select id="level-select" disabled>
            <option value="I">I — Introductorio</option>
            <option value="M">M — Medio</option>
            <option value="A">A — Avanzado</option>
          </select>
        </label>
        <button class="btn btn-primary" id="add-map-btn" disabled>Agregar</button>
      </form>

      <div id="map-feedback" class="form-msg" aria-live="polite"></div>

      <div id="empty-hint" style="padding:.85rem 1rem; border:1px dashed var(--border); border-radius:10px; background:#f8fafc;">
        Selecciona una <b>materia</b> para ver y agregar sus atributos con nivel (I/M/A).
      </div>

      <table class="grid" id="map-table" style="display:none; margin-top:1rem">
        <thead><tr><th>Atributo</th><th>Nombre</th><th>Nivel</th><th></th></tr></thead>
        <tbody id="map-tbody"></tbody>
      </table>
    </section>
  `;

  // Referencias de elementos
  const subjectSelectElement = root.querySelector("#subject-select");
  const attributeSelectElement = root.querySelector("#attribute-select");
  const levelSelectElement = root.querySelector("#level-select");
  const addMapButtonElement = root.querySelector("#add-map-btn");
  const mapTableElement = root.querySelector("#map-table");
  const mapTableBodyElement = root.querySelector("#map-tbody");
  const emptyHintElement = root.querySelector("#empty-hint");
  const feedbackElement = root.querySelector("#map-feedback");

  // Estado
  let selectedSubjectId = "";
  // atributoId -> { nivel, nombre }
  let existingMappingsByAttribute = new Map();

  let feedbackTimerId = null;

  // Helpers
  function setFormFeedback(message, type = "", durationMs = 0) {
    feedbackElement.textContent = message || "";
    feedbackElement.classList.remove("error", "success", "warn", "show");
    if (message) {
      if (type) feedbackElement.classList.add(type);
      feedbackElement.classList.add("show");
    }
    if (feedbackTimerId) {
      clearTimeout(feedbackTimerId);
      feedbackTimerId = null;
    }
    if (durationMs && message) {
      feedbackTimerId = setTimeout(() => {
        feedbackElement.classList.remove("show", "error", "success", "warn");
        feedbackElement.textContent = "";
        feedbackTimerId = null;
      }, durationMs);
    }
  }

  function updateEnabledState() {
    const hasSubject = !!selectedSubjectId;
    levelSelectElement.disabled = !hasSubject;
    addMapButtonElement.disabled = !hasSubject;
    mapTableElement.style.display = hasSubject ? "" : "none";
    emptyHintElement.style.display = hasSubject ? "none" : "";
  }

  async function loadMappings() {
    if (!selectedSubjectId) {
      existingMappingsByAttribute.clear();
      mapTableBodyElement.innerHTML = "";
      updateEnabledState();
      return;
    }

    const mappings = await api(
      `/api/niveles-materia?carrera=${encodeURIComponent(
        selectedCareerId
      )}&materia=${encodeURIComponent(selectedSubjectId)}`
    );

    // Actualiza índice para validación de duplicados
    existingMappingsByAttribute.clear();
    mappings.forEach((row) => {
      existingMappingsByAttribute.set(Number(row.id_atributo), {
        nivel: row.nivel,
        nombre: row.atributo_corto || row.atributo_nombre,
      });
    });

    mapTableBodyElement.innerHTML = mappings
      .map(
        (row) => `
      <tr>
        <td>${row.id_atributo}</td>
        <td>${row.atributo_corto || row.atributo_nombre}</td>
        <td><span class="badge-level">${row.nivel}</span></td>
        <td>
          <button class="btn btn-danger"
                  data-action="delete"
                  data-atrib="${row.id_atributo}"
                  data-atribname="${row.atributo_corto || row.atributo_nombre}"
                  data-matname="${row.nom_materia}">
            Eliminar
          </button>
        </td>
      </tr>
    `
      )
      .join("");

    mapTableBodyElement
      .querySelectorAll('[data-action="delete"]')
      .forEach((buttonEl) => {
        buttonEl.addEventListener("click", onDeleteMappingClick);
      });

    setFormFeedback("");
    updateEnabledState();
  }

  // Eventos
  subjectSelectElement.addEventListener("change", async () => {
    selectedSubjectId = subjectSelectElement.value;
    setFormFeedback("");
    await loadMappings();
  });

  root.querySelector("#map-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!selectedSubjectId) return;

    const selectedAttributeId = Number(attributeSelectElement.value || 0);
    const selectedLevel = String(levelSelectElement.value || "I");

    // Validación en cliente: evitar duplicado
    if (existingMappingsByAttribute.has(selectedAttributeId)) {
      const current = existingMappingsByAttribute.get(selectedAttributeId);
      setFormFeedback(
        `Ya existe un nivel para este atributo (${current.nivel}). ` +
          `Si deseas cambiarlo, elimina el atributo y vuelve a crearlo.`,
        "warn",
        5000
      );

      return;
    }

    const requestBody = {
      id_carrera: selectedCareerId,
      id_materia: selectedSubjectId,
      id_atributo: selectedAttributeId,
      nivel: selectedLevel,
    };

    try {
      await api("/api/niveles-materia", { method: "POST", body: requestBody });
      setFormFeedback("Mapeo agregado correctamente");
      await loadMappings();
    } catch (err) {
      if (err.status === 409) {
        setFormFeedback(
          "Ya existe un mapeo para este atributo en la materia.",
          "warn",
          5000
        );
        await loadMappings();
        return;
      }

      alert(err.message || "No se pudo crear el mapeo");
    }
  });

  async function onDeleteMappingClick(ev) {
    const deleteButtonElement = ev.currentTarget;
    const attributeId = Number(deleteButtonElement.dataset.atrib);
    const attributeName = deleteButtonElement.dataset.atribname;
    const subjectName = deleteButtonElement.dataset.matname;

    try {
      await api(
        `/api/niveles-materia/${encodeURIComponent(
          selectedCareerId
        )}/${encodeURIComponent(selectedSubjectId)}/${attributeId}`,
        { method: "DELETE" }
      );
      await loadMappings();
    } catch (err) {
      if (err.status === 409 && err.data?.code === "DEPENDENCIES_FOUND") {
        const totalAnswers = err.data.counts?.respuestas ?? 0;
        const modalHtml = `
          <p>Mapeo: <b>${subjectName}</b> ↔ <b>${attributeId} ${attributeName}</b></p>
          <p>Dependencias: <b>${totalAnswers}</b> respuesta(s) de alumnos.</p>
          <p>Si continúas, se eliminarán también esas respuestas. Acción irreversible.</p>
        `;
        openConfirmModal({
          title: "Eliminar mapeo Materia ↔ Atributo",
          html: modalHtml,
          okText: "Eliminar definitivamente",
          okVariant: "danger",
          onConfirm: async () => {
            await api(
              `/api/niveles-materia/${encodeURIComponent(
                selectedCareerId
              )}/${encodeURIComponent(
                selectedSubjectId
              )}/${attributeId}?force=1`,
              { method: "DELETE" }
            );
            await loadMappings();
          },
        });
        return;
      }
      alert(err.message || "No se pudo eliminar el mapeo");
    }
  }

  // Estado inicial
  updateEnabledState(); // sin materia seleccionada
}
