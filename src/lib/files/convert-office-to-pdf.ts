import mammoth from "mammoth";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

async function launchBrowser() {
  const isVercel = Boolean(process.env.VERCEL);

  if (isVercel) {
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

  return puppeteer.launch({
    executablePath,
    headless: true,
  });
}

async function convertViaGotenberg(buffer: Buffer, filename: string) {
  const baseUrl = process.env.GOTENBERG_URL?.trim();
  if (!baseUrl) return null;

  const form = new FormData();
  form.append("files", new Blob([new Uint8Array(buffer)]), filename);

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/forms/libreoffice/convert`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function convertOfficeBufferToPdf(
  buffer: Buffer,
  filename: string,
): Promise<{ ok: true; pdf: Buffer } | { ok: false; error: string }> {
  const fromGotenberg = await convertViaGotenberg(buffer, filename);
  if (fromGotenberg) {
    return { ok: true, pdf: fromGotenberg };
  }

  try {
    const { value: html } = await mammoth.convertToHtml({ buffer });
    const documentHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Georgia, "Times New Roman", serif; font-size: 12pt; line-height: 1.55; color: #111; padding: 28px; }
    p { margin: 0 0 0.75em; }
    h1,h2,h3 { margin: 1em 0 0.5em; }
  </style>
</head>
<body>${html}</body>
</html>`;

    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(documentHtml, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", right: "14mm", bottom: "16mm", left: "14mm" },
    });
    await browser.close();

    return { ok: true, pdf: Buffer.from(pdf) };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível converter o documento para PDF.";
    return { ok: false, error: message };
  }
}
