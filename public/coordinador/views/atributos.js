import { api } from "../../assets/js/api.js";
import { openConfirmModal } from "../helpers/modal-util.js";

export async function renderCoordinatorAttributes({ root, selectedCareerId }) {
  root.innerHTML = `
    <section>
      <h2>Atributos de Egreso</h2>
      <form id="attribute-form" class="row" style="margin:.5rem 0 1rem">
        <input id="attribute-id-input" type="number" min="1" max="99" placeholder="ID (1..99)" required>
        <input id="attribute-name-input" placeholder="Nombre del atributo" required>
        <input id="attribute-shortname-input" placeholder="Nombre corto (opcional)">
        <button class="btn btn-primary">Agregar</button>
      </form>
      <table class="grid">
        <thead><tr><th>ID</th><th>Nombre</th><th>Corto</th><th></th></tr></thead>
        <tbody id="attributes-table-body"></tbody>
      </table>
    </section>
  `;

  const attributesTableBodyElement = root.querySelector(
    "#attributes-table-body"
  );
  const attributeFormElement = root.querySelector("#attribute-form");

  async function loadAttributesTable() {
    const attributeList = await api(
      `/api/atributos?carrera=${encodeURIComponent(selectedCareerId)}`
    );
    attributesTableBodyElement.innerHTML = attributeList
      .map(
        (attribute) => `
      <tr>
        <td>${attribute.id_atributo}</td>
        <td>${attribute.nom_atributo}</td>
        <td>${attribute.nomcorto ?? ""}</td>
        <td><button class="btn btn-danger" data-action="delete" data-id="${
          attribute.id_atributo
        }">Eliminar</button></td>
      </tr>
    `
      )
      .join("");
    attributesTableBodyElement
      .querySelectorAll('[data-action="delete"]')
      .forEach((b) => b.addEventListener("click", onDeleteAttributeClick));
  }

  async function onDeleteAttributeClick(event) {
    const deleteButtonElement = event.currentTarget;
    const attributeId = Number(deleteButtonElement.dataset.id);

    try {
      await api(
        `/api/atributos/${encodeURIComponent(selectedCareerId)}/${attributeId}`,
        { method: "DELETE" }
      );
      await loadAttributesTable();
    } catch (error) {
      if (error.status === 409 && error.data?.code === "DEPENDENCIES_FOUND") {
        const totalCriterios = error.data.counts?.criterios ?? 0;
        const totalMapeos = error.data.counts?.mapeos ?? 0;
        const totalRespuestas = error.data.counts?.respuestas ?? 0;

        const modalHtml = `
        <p>Estás por eliminar el atributo <b>${attributeId}</b> de la carrera <b>${selectedCareerId}</b>.</p>
        <p>Dependencias:</p>
        <ul style="margin:.5rem 0 1rem 1.25rem">
          <li><b>${totalCriterios}</b> criterio(s)</li>
          <li><b>${totalMapeos}</b> mapeo(s) Materia↔Atributo</li>
          <li><b>${totalRespuestas}</b> respuesta(s) de alumnos</li>
        </ul>
        <p>Si continúas, se eliminarán <b>también</b> estos datos. Acción irreversible.</p>
      `;

        openConfirmModal({
          title: "Eliminar atributo",
          html: modalHtml,
          okText: "Eliminar definitivamente",
          okVariant: "danger",
          onConfirm: async () => {
            await api(
              `/api/atributos/${encodeURIComponent(
                selectedCareerId
              )}/${attributeId}?force=1`,
              { method: "DELETE" }
            );
            await loadAttributesTable();
          },
        });
        return;
      }
      alert(error.message || "No se pudo eliminar");
    }
  }

  attributeFormElement.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const payload = {
      id_carrera: selectedCareerId,
      id_atributo: Number(root.querySelector("#attribute-id-input").value),
      nom_atributo: root.querySelector("#attribute-name-input").value.trim(),
      nomcorto:
        root.querySelector("#attribute-shortname-input").value.trim() || null,
    };
    await api("/api/atributos", { method: "POST", body: payload });
    attributeFormElement.reset();
    await loadAttributesTable();
  });

  await loadAttributesTable();
}
