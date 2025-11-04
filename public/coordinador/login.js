import { api } from "../assets/js/api.js";

const form = document.getElementById("form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const msg = document.getElementById("msg");

let t = null;
function flash(text, type = "warn", ms = 4000) {
  msg.textContent = text || "";
  msg.className = `form-msg show ${type}`;
  if (t) clearTimeout(t);
  t = setTimeout(() => {
    msg.className = "form-msg";
    msg.textContent = "";
  }, ms);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const r = await api("/api/auth/login", {
      method: "POST",
      body: { email: email.value.trim(), password: password.value },
    });
    if (r.rol !== "COORDINADOR" && r.rol !== "ADMIN") {
      flash("Tu cuenta no tiene permisos de coordinación.", "error", 6000);
      return;
    }
    flash("Acceso correcto. Redirigiendo…", "success", 1200);
    setTimeout(() => {
      window.location.href = "/coordinador/";
    }, 900);
  } catch (err) {
    flash(err.message || "Credenciales inválidas.", "error", 5000);
  }
});
