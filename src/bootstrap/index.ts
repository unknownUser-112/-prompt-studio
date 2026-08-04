const root = document.querySelector<HTMLElement>("[data-prompt-studio-root]");

if (root !== null) {
  root.dataset.ready = "true";
}
