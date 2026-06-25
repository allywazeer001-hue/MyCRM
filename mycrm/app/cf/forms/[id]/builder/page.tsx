// Cloud Forms builder route — renders the form builder inside the CF app.
// The CF layout detects this path and switches to full-screen mode (no sidebar chrome),
// so the builder fills the entire viewport exactly as it does in the CRM dashboard.
export { default } from "@/app/(dashboard)/forms/[id]/builder/page";
