// public/coordinador/views/modal-util.js
function ensureConfirmModal() {
  let modalOverlayElement = document.getElementById("confirm-modal");
  if (modalOverlayElement) return modalOverlayElement;

  modalOverlayElement = document.createElement("div");
  modalOverlayElement.id = "confirm-modal";
  modalOverlayElement.className = "modal-overlay hidden";
  modalOverlayElement.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="cm-title">
      <header><h3 id="cm-title" style="margin:0">Confirmar</h3></header>
      <div class="content" id="cm-content"></div>
      <div class="actions">
        <button class="btn-outline" id="cm-cancel" type="button">Cancelar</button>
        <button class="btn btn-danger" id="cm-ok" type="button">Eliminar definitivamente</button>
      </div>
    </div>`;
  document.body.appendChild(modalOverlayElement);
  return modalOverlayElement;
}

export function openConfirmModal({
  title,
  html,
  onConfirm,
  okText = "Confirmar",
  okVariant = "danger",
}) {
  const modalOverlayElement = ensureConfirmModal();
  const modalTitleElement = modalOverlayElement.querySelector("#cm-title");
  const modalContentElement = modalOverlayElement.querySelector("#cm-content");
  const okButtonElement = modalOverlayElement.querySelector("#cm-ok");
  const cancelButtonElement = modalOverlayElement.querySelector("#cm-cancel");

  modalTitleElement.textContent = title || "Confirmar";
  modalContentElement.innerHTML = html || "";

  okButtonElement.className = `btn ${
    okVariant === "danger" ? "btn-danger" : "btn-primary"
  }`;
  okButtonElement.textContent = okText;

  const closeModal = () => {
    modalOverlayElement.classList.add("hidden");
    okButtonElement.replaceWith(okButtonElement.cloneNode(true));
    cancelButtonElement.replaceWith(cancelButtonElement.cloneNode(true));
  };

  cancelButtonElement.addEventListener("click", closeModal, { once: true });
  okButtonElement.addEventListener(
    "click",
    async () => {
      okButtonElement.disabled = true;
      try {
        await onConfirm?.();
      } finally {
        closeModal();
      }
    },
    { once: true }
  );

  modalOverlayElement.onclick = (ev) => {
    if (ev.target === modalOverlayElement) closeModal();
  };
  document.addEventListener("keydown", function onEsc(ev) {
    if (ev.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", onEsc);
    }
  });

  modalOverlayElement.classList.remove("hidden");
}
