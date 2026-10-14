import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { config } from '../config/index.js';
import { AppError } from '../middlewares/error.js';

async function renderWithWkhtmltopdf(html) {
  // wkhtmltopdf no puede escribir el PDF cuando stdout es un socket AF_UNIX
  // (lo que crea spawn() de Node con stdio 'pipe'): falla con "QPainter::begin():
  // Returned false". Se renderiza a un fichero temporal y se lee al terminar.
  const workDir = await mkdtemp(path.join(tmpdir(), 'wkhtmltopdf-'));
  const outPath = path.join(workDir, 'out.pdf');

  const args = [
    '--quiet',
    '--encoding',
    'utf-8',
    '--print-media-type',
    '--margin-top',
    '12mm',
    '--margin-bottom',
    '12mm',
    '--margin-left',
    '14mm',
    '--margin-right',
    '14mm',
    '-',
    outPath,
  ];

  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(config.pdf.wkhtmltopdfPath, args, {
        stdio: ['pipe', 'ignore', 'pipe'],
      });
      const stderr = [];
      let settled = false;

      const finalize = (error, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve(result);
      };

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        finalize(new AppError('La generación del PDF excedió el tiempo límite', 504, 'PDF_TIMEOUT'));
      }, config.pdf.timeoutMs);

      child.on('error', (error) => {
        if (error.code === 'ENOENT') {
          finalize(
            new AppError(
              `No se encontró el ejecutable de wkhtmltopdf ("${config.pdf.wkhtmltopdfPath}"). Instálalo o define WKHTMLTOPDF_PATH.`,
              500,
              'PDF_PROVIDER_UNAVAILABLE',
            ),
          );
        } else {
          finalize(
            new AppError(`Error al ejecutar wkhtmltopdf: ${error.message}`, 500, 'PDF_RENDER_FAILED'),
          );
        }
      });

      child.stderr.on('data', (chunk) => stderr.push(chunk));

      child.on('close', (code) => {
        if (code !== 0) {
          const detail = Buffer.concat(stderr).toString('utf8').slice(0, 500);
          finalize(
            new AppError(
              `wkhtmltopdf terminó con código ${code}: ${detail}`,
              500,
              'PDF_RENDER_FAILED',
            ),
          );
          return;
        }
        readFile(outPath)
          .then((buffer) => finalize(null, buffer))
          .catch((error) =>
            finalize(
              new AppError(
                `No se pudo leer el PDF generado: ${error.message}`,
                500,
                'PDF_RENDER_FAILED',
              ),
            ),
          );
      });

      child.stdin.on('error', () => {});
      child.stdin.end(html, 'utf8');
    });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function renderWithGotenberg(html) {
  const form = new FormData();
  form.append('files', new Blob([html], { type: 'text/html' }), 'index.html');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.pdf.timeoutMs);

  try {
    const response = await fetch(`${config.pdf.gotenbergUrl}/forms/chromium/convert/html`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AppError(
        `Gotenberg respondió con estado ${response.status}`,
        502,
        'PDF_RENDER_FAILED',
      );
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof AppError) throw error;
    const message = error.name === 'AbortError' ? 'tiempo de espera agotado' : error.message;
    throw new AppError(
      `Error al generar el PDF con Gotenberg: ${message}`,
      502,
      'PDF_RENDER_FAILED',
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function renderPdf(html) {
  const { provider } = config.pdf;

  if (provider === 'wkhtmltopdf') {
    return renderWithWkhtmltopdf(html);
  }
  if (provider === 'gotenberg') {
    return renderWithGotenberg(html);
  }
  if (provider === 'stub') {
    return buildStubPdf(html);
  }

  throw new AppError(
    `Proveedor de PDF no soportado: "${provider}" (usa wkhtmltopdf, gotenberg o stub)`,
    500,
    'PDF_PROVIDER_UNSUPPORTED',
  );
}

function escapePdfText(value) {
  return String(value)
    .replace(/[\\()]/g, ' ')
    .slice(0, 200);
}

function buildStubPdf(html) {
  const label = escapePdfText(
    String(html)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  const content = `BT /F1 12 Tf 50 800 Td (Constancia generada en modo stub) Tj 0 -18 Td (${label}) Tj ET`;

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const startXref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
