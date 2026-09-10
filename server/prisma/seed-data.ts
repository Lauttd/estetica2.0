// =============================================================================
// KAYA KALPA — Datos del catálogo
// =============================================================================
// Este archivo es CONTENIDO, no lógica. Es la fuente del seed y el lugar donde
// revisar que los precios, duraciones y descripciones sean los correctos.
//
// Procedencia de cada dato:
//   · Descripciones, beneficios y recomendaciones -> prompt.md §11–§17 (literal)
//   · Precios -> lista de precios oficial de la estética (imagen), que COMPLETA
//     los precios que el prompt dejaba vacíos y RESUELVE los conflictos.
//   · Duraciones -> prompt.md donde las da. Donde no las da, queda `null`:
//     el prompt §41 prohíbe inventarlas, y un servicio sin duración simplemente
//     no se puede agendar online hasta que la estética la cargue en el panel.
//
// `durationMin: null` o `priceCents: null` marcan el servicio como `needsReview`
// automáticamente (ver seed.ts), así el panel los lista para completar.
// =============================================================================

export interface SeedService {
  slug: string;
  name: string;
  shortDescription: string;
  description?: string;
  benefits?: string[];
  recommendations?: string;
  extraInfo?: string;
  /** null = la estética todavía no confirmó la duración. No se inventa. */
  durationMin: number | null;
  /** En PESOS. null = a consultar. El seed lo convierte a centavos. */
  pricePesos: number | null;
  subgroup?: string;
  /** false = se muestra en el catálogo pero no se agenda como turno suelto. */
  bookable?: boolean;
  featured?: boolean;
}

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  icon: string;
  services: SeedService[];
}

export const CATALOG: SeedCategory[] = [
  // ---------------------------------------------------------------------------
  {
    slug: 'faciales',
    name: 'Faciales',
    description:
      'Tratamientos para una piel sana, luminosa y en equilibrio. Protocolos adaptados a cada tipo de piel.',
    icon: 'face',
    services: [
      {
        slug: 'limpieza-facial-profunda',
        name: 'Limpieza Facial Profunda',
        shortDescription: 'La base de toda piel sana y luminosa.',
        description:
          'Remueve impurezas, células muertas y exceso de sebo acumulado que obstruye los poros.',
        recommendations: 'Se recomienda 1 vez al mes.',
        durationMin: 60,
        pricePesos: 28000,
        featured: true,
      },
      {
        slug: 'peeling-enzimatico',
        name: 'Peeling Enzimático',
        shortDescription: 'Exfoliación suave y sin dolor, ideal para pieles sensibles.',
        description:
          'Realizado con enzimas naturales de frutas que disuelven las células muertas sin irritar.',
        durationMin: 90,
        pricePesos: 35000,
      },
      {
        slug: 'tratamiento-para-acne',
        name: 'Tratamiento para Acné',
        shortDescription: 'Protocolo personalizado para controlar brotes y secuelas.',
        description:
          'Trabajamos para desinflamar, controlar la bacteria del acné, regular el sebo y acelerar la cicatrización.',
        recommendations: 'Requiere constancia.',
        durationMin: 90,
        pricePesos: null, // no figura en ninguna de las dos fuentes
      },
      {
        slug: 'peeling-despigmentante',
        name: 'Peeling Despigmentante',
        shortDescription: 'Nuestro tratamiento estrella para manchas.',
        description:
          'Unifica el tono de la piel trabajando sobre manchas solares, melasma y marcas post-acné.',
        recommendations: 'Se recomienda protocolo de 3 a 4 sesiones.',
        durationMin: 90,
        pricePesos: null, // no figura en ninguna de las dos fuentes
      },
      {
        slug: 'dermaplaning',
        name: 'Dermaplaning',
        shortDescription: 'Exfoliación premium con bisturí quirúrgico estéril.',
        description:
          'Elimina el vello facial, células muertas y todo lo que apaga tu rostro.',
        extraInfo: 'Indoloro.',
        durationMin: 90,
        pricePesos: 38000, // precio de la lista oficial
      },
      {
        slug: 'peeling-dermaplaning-combo-glow',
        name: 'Peeling + Dermaplaning — Combo Glow',
        shortDescription: 'La combinación perfecta. Nuestro tratamiento más pedido.',
        description:
          'Primero realizamos Dermaplaning para dejar la piel totalmente receptiva y luego aplicamos un Peeling específico según tu necesidad.',
        durationMin: 90,
        pricePesos: 45000, // precio de la lista oficial
        featured: true,
      },
      {
        slug: 'hidratacion-facial',
        name: 'Hidratación Facial',
        shortDescription: 'Aporte profundo de agua y activos para una piel confortable.',
        durationMin: null, // solo figura en la lista de precios, sin duración
        pricePesos: 28000,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'radiofrecuencia',
    name: 'Radiofrecuencia',
    description:
      'Tecnología para rejuvenecer sin dolor y sin agujas, estimulando el colágeno propio.',
    icon: 'sparkles',
    services: [
      {
        slug: 'radiofrecuencia-facial-corporal',
        name: 'Radiofrecuencia Facial y Corporal',
        shortDescription: 'Tecnología para rejuvenecer sin dolor y sin agujas.',
        description: 'Calor controlado que estimula el propio colágeno y elastina.',
        benefits: [
          'Reafirma',
          'Define el óvalo facial',
          'Suaviza líneas de expresión',
          'Mejora la flacidez',
          'Efecto lifting natural',
        ],
        extraInfo:
          'Tratamiento indoloro, progresivo y natural. Sin tiempo de recuperación. Ideal para pieles a partir de los 25 años.',
        recommendations: 'Protocolo recomendado: 6 a 8 sesiones.',
        durationMin: 90,
        pricePesos: 43000, // precio de la lista oficial
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'masajes-corporales',
    name: 'Masajes y Tratamientos Corporales',
    description:
      'Para desconectar del estrés, liberar tensiones y volver a sentirte liviana.',
    icon: 'hands',
    services: [
      {
        slug: 'masaje-relajante',
        name: 'Masaje Relajante',
        shortDescription: 'Desconectá el estrés. Reconectá con vos.',
        description:
          'Masajes suaves con diferentes maniobras en espalda, cuello y hombros.',
        extraInfo: 'Sin dolor. Solo relax.',
        durationMin: 60,
        pricePesos: 30000,
      },
      {
        slug: 'masaje-descontracturante',
        name: 'Masaje Descontracturante',
        shortDescription:
          'Ideal para eliminar nudos y contracturas que causan dolor y pérdida de movilidad.',
        description: 'Libera la tensión acumulada y recupera tu bienestar.',
        durationMin: 60,
        pricePesos: 30000,
      },
      {
        slug: 'drenaje-linfatico-manual',
        name: 'Drenaje Linfático Manual',
        shortDescription:
          'Estimula la circulación y facilita la eliminación de líquidos retenidos y toxinas.',
        description: 'Ideal para deshinchar, desintoxicar y sentirse más liviana.',
        durationMin: 60,
        pricePesos: 40000,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'maderoterapia',
    name: 'Maderoterapia',
    description:
      'Técnica manual y holística con instrumentos de madera noble diseñados anatómicamente.',
    icon: 'leaf',
    services: [
      {
        slug: 'maderoterapia',
        name: 'Maderoterapia',
        shortDescription: 'Técnica manual y holística con instrumentos de madera noble.',
        description:
          'Reafirma el cuerpo, reduce grasa localizada, combate la celulitis y modela la figura.',
        extraInfo: 'Precio por zona.',
        durationMin: null, // la estética no informó duración
        pricePesos: 14000,
      },
      {
        slug: 'paquete-mensual-maderoterapia',
        name: 'Paquete Mensual de Maderoterapia',
        shortDescription: 'Plan mensual completo de maderoterapia.',
        durationMin: null,
        pricePesos: 78000,
        subgroup: 'Paquetes',
        bookable: false, // se coordina aparte, no es un turno suelto
      },
      {
        slug: 'manta-termica',
        name: 'Manta Térmica — Paquete Mensual',
        shortDescription:
          'Calor controlado que potencia tratamientos reductores y de maderoterapia.',
        description:
          'Favorece la sudoración y la absorción de activos.',
        durationMin: null,
        pricePesos: 110000,
        subgroup: 'Paquetes',
        bookable: false,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'manos',
    name: 'Manos',
    description: 'Manos prolijas, uñas sanas y un acabado impecable.',
    icon: 'hand',
    services: [
      {
        slug: 'manicura',
        name: 'Manicura',
        shortDescription: 'El cuidado esencial que tus manos necesitan.',
        description: 'Incluye limado, repujado y retirado de cutículas.',
        benefits: [
          'Manos prolijas',
          'Uñas sanas',
          'Cutículas cuidadas',
          'Aspecto impecable',
        ],
        recommendations: 'Mantenimiento recomendado: cada 2 semanas.',
        durationMin: 30,
        pricePesos: 14000,
      },
      {
        slug: 'esmaltado-tradicional',
        name: 'Esmaltado Tradicional',
        shortDescription: 'El clásico de siempre, rápido y elegante.',
        description:
          'Esmaltes comunes de larga duración con brillo espejo. Secado al aire.',
        extraInfo:
          'Duración del esmaltado: 5 días aproximadamente. Duración del servicio: 60 minutos con manicura incluida.',
        durationMin: 60,
        pricePesos: 17000,
      },
      {
        slug: 'semipermanente',
        name: 'Semipermanente',
        shortDescription: 'Color perfecto durante semanas.',
        description: 'Esmalte gel curado en cabina LED.',
        extraInfo: 'Duración: 2 a 3 semanas.',
        durationMin: 90,
        pricePesos: 17000,
      },
      {
        slug: 'semipermanente-con-disenos',
        name: 'Semipermanente con Diseños',
        shortDescription: 'Semipermanente con diseño personalizado.',
        durationMin: null, // solo figura en la lista de precios, sin duración
        pricePesos: 20000,
      },
      {
        slug: 'capping-gel',
        name: 'Capping — Gel',
        shortDescription: 'Fuerza y protección para la uña natural.',
        description: 'Capa fina de gel fortificador sobre el largo natural.',
        benefits: [
          'Uñas que se quiebran',
          'Uñas que no crecen',
          'Mayor duración del esmaltado',
        ],
        extraInfo: 'NO alarga. Duración: 3 a 4 semanas.',
        durationMin: 75,
        pricePesos: 25000,
      },
      {
        slug: 'soft-gel-extensiones',
        name: 'Soft Gel — Extensiones',
        shortDescription: 'Extensión sana y natural.',
        description:
          'Tips de gel premoldeados ultra finos que se adhieren a la uña.',
        benefits: ['Largo perfecto', 'Liviano', 'Natural'],
        extraInfo:
          'Duración del servicio: 90 a 120 minutos. Duración: 3 a 4 semanas con service.',
        durationMin: 120, // se toma el extremo superior del rango, para no superponer turnos
        pricePesos: 28000,
      },
      {
        slug: 'retirado-estetica',
        name: 'Retirado de la Estética',
        shortDescription: 'Retiro de esmaltado o extensiones aplicadas en KAYA KALPA.',
        durationMin: null,
        pricePesos: 5000,
        subgroup: 'Retirados',
      },
      {
        slug: 'retirado-otra-estetica',
        name: 'Retirado de Otra Estética',
        shortDescription: 'Retiro de trabajos realizados en otra estética.',
        durationMin: null,
        pricePesos: 7000,
        subgroup: 'Retirados',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'pies',
    name: 'Pies',
    description: 'Pies sanos, livianos y descansados.',
    icon: 'foot',
    // NOTA: es la sección con más ambigüedad entre el prompt y la lista de
    // precios (los nombres no mapean 1 a 1). Ver CONFLICTOS.md antes de publicar.
    services: [
      {
        slug: 'pedicura',
        name: 'Pedicura',
        shortDescription: 'El cuidado completo que tus pies necesitan.',
        description:
          'Incluye baño tibio con sales, corte y limado de uñas, retiro de cutículas, lijado de durezas y talones, e hidratación.',
        benefits: [
          'Pies sanos',
          'Pies livianos',
          'Pies descansados',
          'Previene uñas encarnadas',
          'Elimina durezas',
        ],
        durationMin: 45,
        pricePesos: 25000,
      },
      {
        slug: 'pedicura-esmaltado-tradicional',
        name: 'Pedicura + Esmaltado Tradicional',
        shortDescription: 'Pedicura completa con esmaltado clásico.',
        description:
          'Incluye pedicura completa, esmaltado tradicional, color a elección y top coat.',
        extraInfo: 'Duración del color: 5 a 7 días.',
        durationMin: 90,
        pricePesos: 20000,
      },
      {
        slug: 'pedicura-semipermanente',
        name: 'Pedicura + Semipermanente',
        shortDescription: 'El más pedido.',
        description:
          'Incluye pedicura completa, preparación de la uña, esmaltado semipermanente y curado en cabina LED.',
        extraInfo: 'Duración del color: 4 a 5 semanas.',
        durationMin: 90,
        pricePesos: 20000, // la lista oficial reemplaza los $30.000 del prompt
        featured: true,
      },
      {
        slug: 'spa-de-pies-completo',
        name: 'Spa de Pies Completo',
        shortDescription: 'La experiencia completa de spa para tus pies.',
        description:
          'Incluye baño caliente con sales, aceites esenciales, exfoliación profunda, lijado de durezas, mascarilla hidratante y masaje relajante hasta pantorrillas.',
        durationMin: 90,
        pricePesos: 30000, // la lista oficial reemplaza los $25.000 del prompt
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'pestanas-cejas',
    name: 'Pestañas y Cejas',
    description: 'Una mirada de impacto, sin maquillaje.',
    icon: 'eye',
    services: [
      {
        slug: 'lifting-de-pestanas',
        name: 'Lifting de Pestañas',
        shortDescription: 'Curva y eleva las pestañas naturales desde la raíz.',
        benefits: [
          'Mirada más abierta',
          'Efecto de mayor longitud',
          'Resultado natural',
        ],
        extraInfo: 'Duración del resultado: 6 a 8 semanas.',
        durationMin: null, // la estética no informó duración del servicio
        pricePesos: 20000,
      },
      {
        slug: 'laminado-de-cejas',
        name: 'Laminado de Cejas',
        shortDescription:
          'Procedimiento semipermanente que redirecciona, alisa y fija el vello de las cejas.',
        benefits: [
          'Cejas más tupidas',
          'Ordenadas',
          'Aspecto orgánico',
          'Efecto fluffy brows',
        ],
        extraInfo: 'Duración: 4 a 6 semanas.',
        durationMin: null,
        pricePesos: 20000,
      },
      {
        slug: 'perfilado-visajismo',
        name: 'Perfilado / Visajismo',
        shortDescription: 'Diseñamos tus cejas según tu rostro.',
        description:
          'Cejas que armonizan, equilibran y realzan tu mirada. El perfilado limpia, recorta, define los ángulos y resalta la mirada.',
        durationMin: null,
        pricePesos: 10000,
      },
      {
        slug: 'lifting-laminado',
        name: 'Lifting + Laminado',
        shortDescription:
          'La dupla perfecta para una mirada de impacto sin maquillaje.',
        extraInfo: 'Despertá lista todos los días.',
        durationMin: null,
        pricePesos: 38000,
      },
    ],
  },
];

// =============================================================================
// HORARIOS DE ATENCIÓN — PLACEHOLDER
// =============================================================================
// La estética NO informó sus horarios y el prompt §41 prohíbe inventarlos.
// Sin horarios no se puede construir ni probar el sistema de turnos, así que se
// siembran como ejemplo EXPLÍCITAMENTE MARCADO con la bandera
// `hours_are_placeholder` en SiteSetting. Mientras esté activa:
//   · el panel muestra un aviso permanente para configurarlos,
//   · la página de Contacto muestra "Horarios a confirmar" en vez de los horarios.
export const PLACEHOLDER_BUSINESS_HOURS: Array<{
  weekday: number;
  startMin: number;
  endMin: number;
}> = [
  { weekday: 1, startMin: 9 * 60, endMin: 13 * 60 }, // lunes mañana
  { weekday: 1, startMin: 16 * 60, endMin: 20 * 60 }, // lunes tarde
  { weekday: 2, startMin: 9 * 60, endMin: 13 * 60 },
  { weekday: 2, startMin: 16 * 60, endMin: 20 * 60 },
  { weekday: 3, startMin: 9 * 60, endMin: 13 * 60 },
  { weekday: 3, startMin: 16 * 60, endMin: 20 * 60 },
  { weekday: 4, startMin: 9 * 60, endMin: 13 * 60 },
  { weekday: 4, startMin: 16 * 60, endMin: 20 * 60 },
  { weekday: 5, startMin: 9 * 60, endMin: 13 * 60 },
  { weekday: 5, startMin: 16 * 60, endMin: 20 * 60 },
  { weekday: 6, startMin: 9 * 60, endMin: 13 * 60 }, // sábado solo mañana
];

// =============================================================================
// PREGUNTAS FRECUENTES
// =============================================================================
// Las 7 preguntas del prompt §26. Las respuestas son BORRADORES apoyados solo
// en datos confirmados; la estética las revisa desde el panel antes de publicar.
export const FAQS: Array<{ question: string; answer: string; sortOrder: number }> = [
  {
    question: '¿Cuánto dura un turno?',
    answer:
      'Depende del tratamiento. Cada servicio tiene su duración indicada en la ficha, y al reservar te mostramos el tiempo total. Si combinás varios servicios en un mismo turno, la duración es la suma de todos.',
    sortOrder: 1,
  },
  {
    question: '¿Cómo puedo cancelar?',
    answer:
      'Podés cancelar desde el enlace que te enviamos al confirmar la reserva, o escribiéndonos por WhatsApp. Te pedimos avisarnos con la mayor anticipación posible así liberamos el horario para otra persona.',
    sortOrder: 2,
  },
  {
    question: '¿Con cuánto tiempo debo reservar?',
    answer:
      'Podés reservar online hasta 60 días antes. Para turnos del mismo día, el sistema pide unas horas de anticipación para que podamos organizar la agenda.',
    sortOrder: 3,
  },
  {
    question: '¿Qué pasa si llego tarde?',
    answer:
      'Te esperamos unos minutos, pero si la demora es mayor puede que tengamos que acortar el tratamiento para no retrasar a las clientas que vienen después. Si te demorás, avisanos por WhatsApp.',
    sortOrder: 4,
  },
  {
    question: '¿Qué debo hacer antes de un tratamiento facial?',
    answer:
      'Vení con el rostro limpio y sin maquillaje si podés. Evitá la exposición solar intensa y la depilación facial en los días previos. Contanos si estás usando algún tratamiento dermatológico o si tenés la piel sensibilizada.',
    sortOrder: 5,
  },
  {
    question: '¿Puedo reservar más de un servicio?',
    answer:
      'Sí. En el catálogo podés ir agregando servicios a tu turno y reservarlos todos juntos en un mismo horario, siempre que su duración combinada entre en la agenda.',
    sortOrder: 6,
  },
  {
    question: '¿Cuáles son los medios de pago?',
    answer:
      'Consultanos por WhatsApp al 3705-194299 y te contamos las opciones disponibles.',
    sortOrder: 7,
  },
];

// =============================================================================
// CONFIGURACIÓN DEL SITIO
// =============================================================================
// Se siembra aquí para que ningún dato de contacto quede hardcodeado en React.
// Lo que la estética no confirmó se deja VACÍO, no inventado: la UI lo detecta
// y muestra un chip sin enlace hasta que se complete desde el panel.
export const SITE_SETTINGS: Record<string, string> = {
  salon_name: 'KAYA KALPA',
  salon_tagline: 'ESTÉTICA PROFESIONAL',
  address: 'FORTÍN YUNKA 1145',
  city: 'Formosa',
  province: 'Formosa',
  country: 'Argentina',
  // Teléfono como se muestra a las personas.
  phone_display: '3705-194299',
  // Formato internacional para el deep link de WhatsApp: 54 + 9 + área + número.
  whatsapp_e164: '5493705194299',
  whatsapp_message: '¡Hola KAYA KALPA! Quisiera consultar por un turno.',
  // Nombres de las redes: confirmados. Las URLs NO, por eso van vacías.
  instagram_name: 'KAYA KALPA ESTÉTICA PROFESIONAL',
  instagram_url: '',
  facebook_name: 'KAYA KALPA ESTÉTICA PROFESIONAL',
  facebook_url: '',
  maps_query: 'FORTÍN YUNKA 1145, Formosa, Argentina',
  // Banderas de datos pendientes: la UI las usa para no afirmar datos sin confirmar.
  hours_are_placeholder: 'true',
  gallery_is_placeholder: 'true',
  // Minutos que un turno PENDING retiene el horario antes de liberarse solo.
  booking_pending_ttl_minutes: '1440',
};
