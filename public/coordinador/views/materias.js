import { api } from "../../assets/js/api.js";
import { openConfirmModal } from "../helpers/modal-util.js";

/* ===== Render ===== */
export async function renderCoordinatorSubjects({ root, selectedCareerId }) {
  root.innerHTML = `
    <section>
      <h2>Materias</h2>
      <form id="subject-form" class="row" style="margin:.5rem 0 1rem">
        <input id="subject-key-input" placeholder="Clave (p.ej. SCD-1015)" required maxlength="12">
        <input id="subject-name-input" placeholder="Nombre de la materia" required maxlength="200">
        <input id="date-start-input" type="date" aria-label="Fecha inicio">
        <input id="date-end-input" type="date" aria-label="Fecha fin">
        <button class="btn btn-primary">Agregar</button>
      </form>
      <table class="grid">
        <thead>
          <tr><th>Clave</th><th>Nombre</th><th>Inicio</th><th>Fin</th><th></th></tr>
        </thead>
        <tbody id="subjects-table-body"></tbody>
      </table>
    </section>
  `;

  const subjectsTableBodyElement = root.querySelector("#subjects-table-body");
  const subjectFormElement = root.querySelector("#subject-form");

  async function loadSubjectsTable() {
    const subjectList = await api(
      `/api/materias?carrera=${encodeURIComponent(selectedCareerId)}`
    );
    subjectsTableBodyElement.innerHTML = subjectList
      .map(
        (subject) => `
      <tr>
        <td data-col="clave">${subject.id_materia}</td>
        <td data-col="nombre">${subject.nom_materia}</td>
        <td>${subject.mat_fecini ?? ""}</td>
        <td>${subject.mat_fecfin ?? ""}</td>
        <td><button class="btn btn-danger" data-action="delete" data-clave="${
          subject.id_materia
        }">Eliminar</button></td>
      </tr>
    `
      )
      .join("");
    subjectsTableBodyElement
      .querySelectorAll('[data-action="delete"]')
      .forEach((b) => b.addEventListener("click", onDeleteSubjectClick));
  }

  async function onDeleteSubjectClick(ev) {
    const deleteButtonElement = ev.currentTarget;
    const subjectKey = deleteButtonElement.dataset.clave;
    const rowElement = deleteButtonElement.closest("tr");
    const subjectName = rowElement.querySelector(
      '[data-col="nombre"]'
    ).textContent;

    try {
      await api(`/api/materias/${encodeURIComponent(subjectKey)}`, {
        method: "DELETE",
      });
      await loadSubjectsTable();
    } catch (error) {
      if (error.status === 409 && error.data?.code === "DEPENDENCIES_FOUND") {
        const totalAnswers = error.data.counts?.respuestas ?? 0;
        const totalMappings = error.data.counts?.mapa ?? 0;

        const modalHtml = `
          <p><b>Nombre de materia:</b> ${subjectName}<br>
             <b>Clave:</b> ${subjectKey}</p>
          <p>Dependencias detectadas:</p>
          <ul style="margin:.5rem 0 1rem 1.25rem">
            <li><b>${totalAnswers}</b> respuesta(s) de alumnos</li>
            <li><b>${totalMappings}</b> relación(es) Materia↔Atributo</li>
          </ul>
          <p>Si continúas, se eliminarán <b>también</b> estas respuestas y relaciones. Acción irreversible.</p>
        `;
        openConfirmModal({
          title: "Eliminar materia",
          html: modalHtml,
          okText: "Eliminar definitivamente",
          okVariant: "danger",
          onConfirm: async () => {
            await api(
              `/api/materias/${encodeURIComponent(subjectKey)}?force=1`,
              { method: "DELETE" }
            );
            await loadSubjectsTable();
          },
        });
        return;
      }
      alert(error.message || "No se pudo eliminar");
    }
  }

  subjectFormElement.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const payload = {
      id_materia: root.querySelector("#subject-key-input").value.trim(),
      nom_materia: root.querySelector("#subject-name-input").value.trim(),
      id_carrera: selectedCareerId,
      mat_fecini: root.querySelector("#date-start-input").value || null,
      mat_fecfin: root.querySelector("#date-end-input").value || null,
    };
    await api("/api/materias", { method: "POST", body: payload });
    subjectFormElement.reset();
    await loadSubjectsTable();
  });

  await loadSubjectsTable();
}
