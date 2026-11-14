/** Print HTML (`srcdoc`) or a URL (`src`) through a hidden iframe. */
export function printInFrame(source: { srcdoc: string } | { src: string }) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  if ("srcdoc" in source) frame.srcdoc = source.srcdoc;
  else frame.src = source.src;
  document.body.appendChild(frame);
}

export function base64ToBlobUrl(base64: string, mime: string): string {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}
