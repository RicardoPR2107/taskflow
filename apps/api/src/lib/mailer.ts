import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { env } from '../config/env.js';

interface PasswordResetEmail {
  to: string;
  name: string;
  link: string;
  minutesValid: number;
}

/**
 * Envío de correos. TaskFlow todavía no tiene un servicio de correo real (queda fuera del alcance
 * inicial), así que esta es la ÚNICA pieza que habría que reemplazar (por ejemplo, con SMTP)
 * para enviar correos de verdad. El resto de la aplicación no cambia.
 */
export async function sendPasswordResetEmail({ to, name, link, minutesValid }: PasswordResetEmail) {
  if (env.NODE_ENV === 'production') {
    // En producción jamás se imprimen enlaces de recuperación: darían acceso a la cuenta.
    console.warn(
      'Recuperación de contraseña solicitada, pero no hay servicio de correo configurado.',
    );
    return;
  }

  // Bandeja de salida para pruebas automáticas (E2E): guarda cada correo como una línea JSON.
  if (env.MAIL_OUTBOX_FILE) {
    await mkdir(dirname(env.MAIL_OUTBOX_FILE), { recursive: true });
    await appendFile(
      env.MAIL_OUTBOX_FILE,
      `${JSON.stringify({ to, link, at: new Date().toISOString() })}\n`,
    );
  }

  console.log(
    [
      '',
      '──────── [correo simulado] Recuperación de contraseña ────────',
      `Para:    ${name} <${to}>`,
      `Enlace:  ${link}`,
      `Válido por ${minutesValid} minutos y de un solo uso.`,
      '──────────────────────────────────────────────────────────────',
      '',
    ].join('\n'),
  );
}
