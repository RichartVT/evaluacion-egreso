import { api } from "/assets/js/api.js";

const params = new URLSearchParams(location.search);
const materiaId = params.get("materia");

const head = document.getElementById("materia-head");
const bloques = document.getElementById("bloques");
const form = document.getElementById("form-encuesta");
const msg = document.getElementById("msg");

function showMsg(text, kind = "warn") {
  msg.textContent = text;
  msg.className = `alert ${kind === "ok" ? "alert-ok" : "alert-warn"}`;
  msg.style.display = "block";
}

function radioGroupName(a, c) {
  return `a${a}_c${c}`;
}

function renderEncuesta(data) {
  head.textContent = `Materia: ${data.materia.id_materia} — ${data.materia.nom_materia} · Periodo ${data.periodo}`;

  if (!data.atributos.length) {
    showMsg("Esta materia no tiene criterios configurados.", "warn");
    form.querySelector("button[type=submit]").disabled = true;
    return;
  }

  if (data.yaRespondida) {
    showMsg(
      "Ya enviaste respuestas para esta materia en el periodo actual. Si vuelves a enviar, se actualizarán.",
      "ok"
    );
  }

  bloques.innerHTML = data.atributos
    .map(
      (a) => `
    <section class="grupo">
      <div><strong>(${a.id_atributo}) ${
        a.nom_atributo
      }</strong> <span class="badge">Nivel ${a.nivel}</span></div>
      ${a.criterios
        .map(
          (c) => `
        <div class="criterio">
          <div><strong>${a.id_atributo}.${c.id_criterio}</strong> — ${
            c.descripcion
          }</div>
          <div class="likert">
            ${[1, 2, 3, 4]
              .map(
                (n) => `
              <label><input type="radio" name="${radioGroupName(
                a.id_atributo,
                c.id_criterio
              )}" value="${n}"> ${n}</label>
            `
              )
              .join("")}
          </div>
          <div class="muted" style="font-size:12px;margin-top:6px">
            N1: ${c.des_n1} · N2: ${c.des_n2} · N3: ${c.des_n3} · N4: ${
            c.des_n4
          }
          </div>
        </div>
      `
        )
        .join("")}
    </section>
  `
    )
    .join("");
}

async function load() {
  if (!materiaId) {
    showMsg("Falta parámetro ?materia=CLAVE", "warn");
    form.querySelector("button[type=submit]").disabled = true;
    return;
  }
  const data = await api(
    `/api/alumno/encuesta/${encodeURIComponent(materiaId)}`
  );
  renderEncuesta(data);
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    const data = await api(
      `/api/alumno/encuesta/${encodeURIComponent(materiaId)}`
    );
    // recolectar respuestas
    const answers = [];
    for (const a of data.atributos) {
      for (const c of a.criterios) {
        const name = radioGroupName(a.id_atributo, c.id_criterio);
        const value = form.querySelector(
          `input[name="${name}"]:checked`
        )?.value;
        if (!value) {
          showMsg(
            `Falta responder el criterio ${a.id_atributo}.${c.id_criterio}`,
            "warn"
          );
          return;
        }
        answers.push({
          id_atributo: a.id_atributo,
          id_criterio: c.id_criterio,
          likert: Number(value),
        });
      }
    }
    await api(`/api/alumno/encuesta/${encodeURIComponent(materiaId)}`, {
      method: "POST",
      json: { answers },
    });
    showMsg("¡Respuestas enviadas! Gracias.", "ok");
    setTimeout(() => (location.href = "/alumno/?ok=1"), 1200);
  } catch (err) {
    showMsg(err.message || "No se pudo enviar la encuesta", "warn");
  }
});

load();
