// =============================================================================
// KAYA KALPA — Seed de la base de datos
// =============================================================================
// Idempotente: se puede correr las veces que haga falta sin duplicar nada.
// Todos los datos de contenido salen de `seed-data.ts`.
//
//   npm run db:seed          (desde la raíz)
//
// Lo único que este script imprime en pantalla son las credenciales del primer
// administrador (una sola vez) y la lista de datos que la estética todavía tiene
// que confirmar.
// =============================================================================

import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient, AdminRole } from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import {
  CATALOG,
  FAQS,
  PLACEHOLDER_BUSINESS_HOURS,
  SITE_SETTINGS,
} from './seed-data';

// El .env vive en la raíz del monorepo, compartido con docker-compose.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function seedCatalog() {
  let serviceCount = 0;
  const needsReview: Array<{ name: string; missing: string[] }> = [];

  for (const [categoryIndex, category] of CATALOG.entries()) {
    const categoryRow = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        icon: category.icon,
        sortOrder: categoryIndex,
        active: true,
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        sortOrder: categoryIndex,
        active: true,
      },
    });

    for (const [serviceIndex, service] of category.services.entries()) {
      // Un servicio necesita duración y precio confirmados. Lo que falte se
      // marca para que el panel lo liste y la estética lo complete.
      const missing: string[] = [];
      if (service.pricePesos === null) missing.push('precio');

      const data = {
        categoryId: categoryRow.id,
        name: service.name,
        shortDescription: service.shortDescription,
        description: service.description ?? null,
        benefits: service.benefits ?? [],
        recommendations: service.recommendations ?? null,
        extraInfo: service.extraInfo ?? null,
        durationMin: service.durationMin,
        priceCents: service.pricePesos === null ? null : service.pricePesos * 100,
        subgroup: service.subgroup ?? null,
        bookable: service.bookable ?? true,
        needsReview: missing.length > 0,
        featured: service.featured ?? false,
        sortOrder: serviceIndex,
        active: true,
      };

      await prisma.service.upsert({
        where: { slug: service.slug },
        update: data,
        create: { slug: service.slug, ...data },
      });

      if (missing.length > 0) {
        needsReview.push({ name: service.name, missing });
      }
      serviceCount += 1;
    }
  }

  return { serviceCount, needsReview };
}

async function seedProfessionals() {
  // Dos profesionales genéricos: la estética los renombra y ajusta sus
  // servicios y horarios desde el panel. Ambos quedan habilitados para todos
  // los servicios agendables, para que el flujo de reserva funcione ya.
  const bookableServices = await prisma.service.findMany({
    where: { active: true, bookable: true },
    select: { id: true },
  });

  const professionals = [
    { slug: 'profesional-1', name: 'Profesional 1', sortOrder: 0 },
    { slug: 'profesional-2', name: 'Profesional 2', sortOrder: 1 },
  ];

  for (const professional of professionals) {
    const row = await prisma.professional.upsert({
      where: { slug: professional.slug },
      update: { name: professional.name, sortOrder: professional.sortOrder },
      create: {
        slug: professional.slug,
        name: professional.name,
        active: true,
        sortOrder: professional.sortOrder,
      },
    });

    // Asignación de servicios (idempotente vía skipDuplicates).
    await prisma.professionalService.createMany({
      data: bookableServices.map((service) => ({
        professionalId: row.id,
        serviceId: service.id,
      })),
      skipDuplicates: true,
    });

    // Horarios de atención placeholder, marcados como tales en SiteSetting.
    for (const hour of PLACEHOLDER_BUSINESS_HOURS) {
      await prisma.businessHour.upsert({
        where: {
          professionalId_weekday_startMin: {
            professionalId: row.id,
            weekday: hour.weekday,
            startMin: hour.startMin,
          },
        },
        update: { endMin: hour.endMin, active: true },
        create: {
          professionalId: row.id,
          weekday: hour.weekday,
          startMin: hour.startMin,
          endMin: hour.endMin,
          active: true,
        },
      });
    }
  }

  return professionals.length;
}

async function seedContent() {
  for (const faq of FAQS) {
    const existing = await prisma.fAQ.findFirst({ where: { question: faq.question } });
    if (existing) {
      await prisma.fAQ.update({
        where: { id: existing.id },
        data: { answer: faq.answer, sortOrder: faq.sortOrder },
      });
    } else {
      await prisma.fAQ.create({ data: { ...faq, active: true } });
    }
  }

  for (const [key, value] of Object.entries(SITE_SETTINGS)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: {}, // no pisar lo que la estética ya haya configurado
      create: { key, value },
    });
  }

  // La galería arranca con placeholders en la paleta de la marca. Cuando la
  // estética entregue las fotos reales, se reemplazan desde el panel.
  const galleryCount = await prisma.galleryImage.count();
  if (galleryCount === 0) {
    await prisma.galleryImage.createMany({
      data: Array.from({ length: 8 }, (_, index) => ({
        src: `/images/gallery/placeholder-${(index % 4) + 1}.svg`,
        alt: `Trabajo de KAYA KALPA Estética Profesional — imagen de referencia ${
          index + 1
        }`,
        category: 'General',
        width: 800,
        height: 1000,
        sortOrder: index,
        active: true,
      })),
    });
  }

  return { faqs: FAQS.length, settings: Object.keys(SITE_SETTINGS).length };
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administración';

  if (!email || !password) {
    console.log(
      '\n  ⚠  ADMIN_EMAIL o ADMIN_PASSWORD no están definidos en .env.' +
        '\n     Se omite la creación del administrador.\n',
    );
    return null;
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`  ·  El administrador ${email} ya existe, se omite.`);
    return null;
  }

  const admin = await prisma.adminUser.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role: AdminRole.ADMIN,
      active: true,
      // La contraseña inicial sale de un archivo `.env`, que se comparte por
      // chat, se copia entre máquinas y alguna vez termina commiteado por error.
      // Marcarla para cambiarla es lo que hace que ese texto plano deje de servir
      // como credencial en cuanto alguien entra por primera vez.
      mustChangePassword: true,
    },
  });

  // Se muestran una sola vez, acá. No se guardan en ningún archivo ni se loguean.
  return { email: admin.email, password };
}

async function main() {
  console.log('\n🌿  KAYA KALPA — Cargando datos iniciales\n');

  const { serviceCount, needsReview } = await seedCatalog();
  console.log(
    `  ✓  Catálogo: ${CATALOG.length} categorías, ${serviceCount} servicios`,
  );

  const professionalCount = await seedProfessionals();
  console.log(
    `  ✓  Profesionales: ${professionalCount} (habilitados para todos los servicios agendables)`,
  );

  const content = await seedContent();
  console.log(
    `  ✓  Contenido: ${content.faqs} preguntas frecuentes, ${content.settings} ajustes del sitio`,
  );

  const credentials = await seedAdmin();
  if (credentials) {
    console.log(
      '\n  ┌─────────────────────────────────────────────────────────┐' +
        '\n  │  ACCESO AL PANEL ADMINISTRATIVO                         │' +
        '\n  ├─────────────────────────────────────────────────────────┤' +
        `\n  │  Usuario:  ${credentials.email.padEnd(44)}│` +
        `\n  │  Password: ${credentials.password.padEnd(44)}│` +
        '\n  ├─────────────────────────────────────────────────────────┤' +
        '\n  │  ⚠  Cambiá esta contraseña después del primer ingreso.  │' +
        '\n  │  ⚠  No se vuelve a mostrar.                            │' +
        '\n  └─────────────────────────────────────────────────────────┘',
    );
  }

  if (needsReview.length > 0) {
    console.log(
      '\n  ⚠  DATOS A CONFIRMAR CON LA ESTÉTICA' +
        '\n     Estos servicios quedaron sin precio porque no figura en la información' +
        '\n     ni en el prompt ni en la lista de precios. No se inventaron: los' +
        '\n     Se completan desde el panel administrativo.\n',
    );
    for (const item of needsReview) {
      console.log(`     · ${item.name.padEnd(38)} falta: ${item.missing.join(' y ')}`);
    }
    console.log('');
  }

  console.log('✅  Listo.\n');
}

main()
  .catch((error) => {
    console.error('\n❌  Error al cargar los datos iniciales:\n', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
