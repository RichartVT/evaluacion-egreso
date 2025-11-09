import { api } from "/assets/js/api.js";

const params = new URLSearchParams(location.search);
const materiaId = params.get("materia");

// UI
const head = document.getElementById("materia-head");
const bloques = document.getElementById("bloques");
const form = document.getElementById("form-encuesta");
const msg = document.getElementById("msg");
const submitBtn = form.querySelector('button[type="submit"]');

// helpers de mensajes
function showMsg(text, kind = "warn") {
  msg.textContent = text;
  msg.className = `alert ${kind === "ok" ? "alert-ok" : "alert-warn"}`;
  msg.style.display = "block";
}
function hideMsg() {
  msg.style.display = "none";
  msg.textContent = "";
  msg.className = "alert alert-warn";
}

function radioGroupName(a, c) {
  return `a${a}_c${c}`;
}

function renderEncuesta(data) {
  head.textContent = `Materia: ${data.materia.id_materia} — ${data.materia.nom_materia} · Periodo ${data.periodo}`;

  // sin criterios configurados
  if (!data.atributos.length) {
    showMsg("Esta materia no tiene criterios configurados.", "warn");
    submitBtn.disabled = true;
    return;
  }

  if (data.yaRespondida) {
    showMsg(
      "Ya enviaste respuestas para esta materia en el periodo actual. Si vuelves a enviar, se actualizarán.",
      "ok"
    );
  } else {
    hideMsg();
  }

  // construir el formulario con data-attributes para el recolector
  bloques.innerHTML = data.atributos
    .map(
      (a) => `
      <section class="grupo">
        <div>
          <strong>(${a.id_atributo}) ${a.nom_atributo}</strong>
          <span class="badge">Nivel ${a.nivel}</span>
        </div>
        ${a.criterios
          .map(
            (c) => `
          <div class="criterio"
               data-question
               data-atributo="${a.id_atributo}"
               data-criterio="${c.id_criterio}">
            <div><strong>${a.id_atributo}.${c.id_criterio}</strong> — ${
              c.descripcion
            }</div>
            <div class="likert">
              ${[1, 2, 3, 4]
                .map(
                  (n) => `
                <label>
                  <input type="radio"
                         name="${radioGroupName(a.id_atributo, c.id_criterio)}"
                         value="${n}"> ${n}
                </label>`
                )
                .join("")}
            </div>
            <div class="muted" style="font-size:12px;margin-top:6px">
              N1: ${c.des_n1} · N2: ${c.des_n2} · N3: ${c.des_n3} · N4: ${
              c.des_n4
            }
            </div>
          </div>`
          )
          .join("")}
      </section>`
    )
    .join("");
}

async function load() {
  if (!materiaId) {
    showMsg("Falta parámetro ?materia=CLAVE", "warn");
    submitBtn.disabled = true;
    return;
  }
  const data = await api(
    `/api/alumno/encuesta/${encodeURIComponent(materiaId)}`
  );
  renderEncuesta(data);
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMsg();

  // Recolectar respuestas SOLO dentro de #bloques
  const answers = [];
  bloques.querySelectorAll("[data-question]").forEach((q) => {
    const id_atributo = Number(q.dataset.atributo);
    const id_criterio = Number(q.dataset.criterio);
    const checked = q.querySelector('input[type="radio"]:checked');
    if (checked) {
      answers.push({
        id_atributo,
        id_criterio,
        likert: Number(checked.value),
      });
    }
  });

  if (answers.length === 0) {
    showMsg("Selecciona al menos una respuesta antes de enviar.", "warn");
    return;
  }

  try {
    submitBtn.disabled = true;
    await api(`/api/alumno/encuesta/${encodeURIComponent(materiaId)}`, {
      method: "POST",
      body: { answers }, // ← el backend espera exactamente { answers: [...] }
    });
    showMsg("¡Respuestas guardadas!", "ok");
    // Redirigir al dashboard del alumno
    window.location.href = "/alumno/";
  } catch (e) {
    showMsg(e.message || "No se pudo guardar.", "warn");
  } finally {
    submitBtn.disabled = false;
  }
});

// init
load();
