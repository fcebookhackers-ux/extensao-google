const BUTTON_ID = "zapfllow-analyze-button";

function isTargetSite(): boolean {
  const host = window.location.hostname;
  return (
    host.includes("mercadolivre.com") ||
    host.includes("mercadolivre.com.br") ||
    host.includes("shopee.com.br") ||
    host.includes("shopee.com")
  );
}

function ensureButton(): void {
  if (!isTargetSite()) return;
  if (document.getElementById(BUTTON_ID)) return;

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.textContent = "Analisar Concorrência";
  button.style.position = "fixed";
  button.style.bottom = "24px";
  button.style.right = "24px";
  button.style.zIndex = "999999";
  button.style.padding = "12px 16px";
  button.style.borderRadius = "999px";
  button.style.border = "0";
  button.style.cursor = "pointer";
  button.style.fontFamily = "system-ui, -apple-system, Segoe UI, Arial, sans-serif";
  button.style.fontWeight = "600";
  button.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
  button.style.background = "#111827";
  button.style.color = "#ffffff";

  button.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_PRODUCT",
      url: window.location.href
    });
    console.log("Analyze response:", response);
  });

  document.body.appendChild(button);
}

const observer = new MutationObserver(() => ensureButton());
observer.observe(document.documentElement, { childList: true, subtree: true });
ensureButton();
