import { api } from "../../assets/js/api.js";
import { openConfirmModal } from "../helpers/modal-util.js";

export async function renderCoordinatorCriteria({ root, selectedCareerId }) {
  // Cargar atributos para el selector
  const attributeList = await api(
    `/api/atributos?carrera=${encodeURIComponent(selectedCareerId)}`
  );

  root.innerHTML = `
    <section>
      <h2>Criterios</h2>

      <form id="criteria-form" class="row" style="margin:.5rem 0 1rem">
        <label>Atributo
          <select id="attribute-select" required>
            ${attributeList
              .map(
                (a) =>
                  `<option value="${a.id_atributo}">${a.id_atributo} — ${
                    a.nomcorto || a.nom_atributo
                  }</option>`
              )
              .join("")}
          </select>
        </label>
        <input id="criteria-id-input" type="number" min="1" max="99" placeholder="ID criterio" required>
        <input id="criteria-desc-input" placeholder="Descripción" required>
        <input id="n1-input" placeholder="Nivel N1" required>
        <input id="n2-input" placeholder="Nivel N2" required>
        <input id="n3-input" placeholder="Nivel N3" required>
        <input id="n4-input" placeholder="Nivel N4" required>
        <button class="btn btn-primary">Agregar</button>
      </form>

      <div class="row" style="margin-bottom:.5rem">
        <label>Filtrar por atributo
          <select id="filter-attribute">
            <option value="">Todos</option>
            ${attributeList
              .map(
                (a) =>
                  `<option value="${a.id_atributo}">${a.id_atributo} — ${
                    a.nomcorto || a.nom_atributo
                  }</option>`
              )
              .join("")}
          </select>
        </label>
      </div>

      <table class="grid">
        <thead>
          <tr>
            <th>Atrib</th><th>Criterio</th><th>Descripción</th>
            <th>N1</th><th>N2</th><th>N3</th><th>N4</th><th></th>
          </tr>
        </thead>
        <tbody id="criteria-table-body"></tbody>
      </table>
    </section>
  `;

  const attributeSelectElement = root.querySelector("#attribute-select");
  const criteriaFormElement = root.querySelector("#criteria-form");
  const criteriaTableBodyElement = root.querySelector("#criteria-table-body");
  const filterAttributeElement = root.querySelector("#filter-attribute");

  async function loadCriteriaTable() {
    const filterAttrId = filterAttributeElement.value;
    const query = filterAttrId
      ? `?carrera=${selectedCareerId}&atributo=${filterAttrId}`
      : `?carrera=${selectedCareerId}`;
    const criteriaList = await api(`/api/criterios${query}`);

    criteriaTableBodyElement.innerHTML = criteriaList
      .map(
        (c) => `
      <tr>
        <td>${c.id_atributo}</td>
        <td>${c.id_criterio}</td>
        <td>${c.descripcion}</td>
        <td>${c.des_n1}</td>
        <td>${c.des_n2}</td>
        <td>${c.des_n3}</td>
        <td>${c.des_n4}</td>
        <td>
          <button class="btn btn-danger" data-action="delete"
                  data-atrib="${c.id_atributo}" data-crit="${c.id_criterio}">
            Eliminar
          </button>
        </td>
      </tr>
    `
      )
      .join("");

    criteriaTableBodyElement
      .querySelectorAll('[data-action="delete"]')
      .forEach((buttonEl) => {
        buttonEl.addEventListener("click", onDeleteCriteriaClick);
      });
  }

  async function onDeleteCriteriaClick(event) {
    const deleteButtonElement = event.currentTarget;
    const attributeId = Number(deleteButtonElement.dataset.atrib);
    const criteriaId = Number(deleteButtonElement.dataset.crit);

    try {
      // intento normal
      await api(
        `/api/criterios/${encodeURIComponent(
          selectedCareerId
        )}/${attributeId}/${criteriaId}`,
        { method: "DELETE" }
      );
      await loadCriteriaTable();
    } catch (error) {
      if (error.status === 409 && error.data?.code === "DEPENDENCIES_FOUND") {
        const totalAnswers = error.data.counts?.respuestas ?? 0;
        const modalHtml = `
          <p>Estás por eliminar el criterio <b>${criteriaId}</b> del atributo <b>${attributeId}</b>
             en la carrera <b>${selectedCareerId}</b>.</p>
          <p>Dependencias detectadas:</p>
          <ul style="margin:.5rem 0 1rem 1.25rem">
            <li><b>${totalAnswers}</b> respuesta(s) de alumnos</li>
          </ul>
          <p>Si continúas, se eliminarán también estas respuestas. Acción irreversible.</p>
        `;
        openConfirmModal({
          title: "Eliminar criterio",
          html: modalHtml,
          okText: "Eliminar definitivamente",
          okVariant: "danger",
          onConfirm: async () => {
            await api(
              `/api/criterios/${encodeURIComponent(
                selectedCareerId
              )}/${attributeId}/${criteriaId}?force=1`,
              { method: "DELETE" }
            );
            await loadCriteriaTable();
          },
        });
        return;
      }
      alert(error.message || "No se pudo eliminar");
    }
  }

  criteriaFormElement.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const payload = {
      id_carrera: selectedCareerId,
      id_atributo: Number(attributeSelectElement.value),
      id_criterio: Number(root.querySelector("#criteria-id-input").value),
      descripcion: root.querySelector("#criteria-desc-input").value.trim(),
      des_n1: root.querySelector("#n1-input").value.trim(),
      des_n2: root.querySelector("#n2-input").value.trim(),
      des_n3: root.querySelector("#n3-input").value.trim(),
      des_n4: root.querySelector("#n4-input").value.trim(),
    };
    await api("/api/criterios", { method: "POST", body: payload });
    criteriaFormElement.reset();
    await loadCriteriaTable();
  });

  filterAttributeElement.addEventListener("change", loadCriteriaTable);

  await loadCriteriaTable();
}
