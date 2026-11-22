import { configToJson, configToText, exportFileName, type ExportableConfig } from "../shared/exportConfig";

function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadConfig(config: ExportableConfig, kind: "json" | "txt"): void {
  const content = kind === "json" ? configToJson(config) : configToText(config);
  const mime = kind === "json" ? "application/json" : "text/plain;charset=utf-8";
  downloadTextFile(exportFileName(config.companyName, kind), content, mime);
}
