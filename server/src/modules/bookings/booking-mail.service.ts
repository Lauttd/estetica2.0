import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { prisma } from '../../config/prisma';

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const REMINDER_INTERVAL_MS = 5 * 60 * 1000;

const transporter =
  env.SMTP_HOST !== undefined &&
  env.SMTP_USER !== undefined &&
  env.SMTP_PASS !== undefined
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
    timeZone: env.timezone,
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: env.timezone,
  }).format(date);
}

function message(args: {
  firstName: string;
  code: string;
  startAt: Date;
  professional: string;
  reminder: boolean;
}) {
  const { firstName, code, startAt, professional, reminder } = args;
  return {
    subject: reminder ? `Recordatorio de tu turno ${code}` : `Confirmación de tu turno ${code}`,
    text: [
      `Hola ${firstName}.`,
      reminder
        ? `Te recordamos que tenés un turno mañana a las ${formatTime(startAt)}.`
        : 'Tu turno quedó registrado.',
      `Fecha: ${formatDate(startAt)}.`,
      `Hora: ${formatTime(startAt)}.`,
      `Profesional: ${professional}.`,
      `Código: ${code}.`,
      'Podés consultar tu turno desde la página de KAYA KALPA usando ese código.',
    ].join('\n'),
  };
}

export async function sendBookingConfirmation(args: {
  email: string | undefined;
  firstName: string;
  code: string;
  startAt: Date;
  professional: string;
}): Promise<void> {
  if (transporter === null || args.email === undefined) return;

  const mail = message({ ...args, reminder: false });
  await transporter.sendMail({ from: env.EMAIL_FROM, to: args.email, ...mail });
}

async function sendDueReminders(): Promise<void> {
  if (transporter === null) return;

  const now = new Date();
  const until = new Date(now.getTime() + REMINDER_WINDOW_MS);
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      reminderSentAt: null,
      startAt: { gte: now, lte: until },
      customer: { email: { not: null } },
    },
    select: {
      id: true,
      code: true,
      startAt: true,
      professional: { select: { name: true } },
      customer: { select: { firstName: true, email: true } },
    },
  });

  for (const booking of bookings) {
    if (booking.customer.email === null) continue;
    const mail = message({
      firstName: booking.customer.firstName,
      code: `KK-${booking.code}`,
      startAt: booking.startAt,
      professional: booking.professional.name,
      reminder: true,
    });
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: booking.customer.email,
      ...mail,
    });
    await prisma.booking.updateMany({
      where: { id: booking.id, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
    });
  }
}

export function startBookingReminderWorker(): NodeJS.Timeout | null {
  if (transporter === null) {
    logger.warn('Correo desactivado: configurá SMTP_HOST, SMTP_USER, SMTP_PASS y EMAIL_FROM para enviar avisos.');
    return null;
  }

  const timer = setInterval(() => {
    void sendDueReminders().catch((error: unknown) => {
      logger.error({ err: error }, 'No se pudieron enviar los recordatorios de turnos.');
    });
  }, REMINDER_INTERVAL_MS);
  timer.unref();
  return timer;
}
