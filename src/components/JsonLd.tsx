import { SITE, COURSE, TARIFFS, EXPERTS } from "@/data/content";

function buildOrganizationSchema() {
  return {
    "@type": "Organization",
    name: SITE.fullName,
    legalName: SITE.operatorFull,
    url: SITE.url,
    logo: `${SITE.url}/favicon.jpg`,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.city,
      addressCountry: "RU",
      streetAddress: SITE.address,
    },
    sameAs: [SITE.socials.telegram, SITE.socials.vk],
  };
}

function buildCourseSchema() {
  return {
    "@type": "Course",
    name: COURSE.title,
    description:
      "Первая в России система ИИ для юриста по банкротству (БФЛ): реестр требований, отзывы, оспаривание сделок, Федресурс/КАД — до внедрения своего ИИ-конвейера.",
    provider: buildOrganizationSchema(),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      startDate: COURSE.startDateISO,
      duration: "P8W",
      instructor: EXPERTS.filter((e) => e.isFounder).map((e) => ({
        "@type": "Person",
        name: e.name,
        jobTitle: e.role,
      })),
      offers: TARIFFS.map((t) => ({
        "@type": "Offer",
        name: t.name,
        price: t.price,
        priceCurrency: "RUB",
        availability: "https://schema.org/InStock",
        url: `${SITE.url}/tariffs`,
      })),
    },
    // aggregateRating убран: рейтинг/число выпускников требуют документального
    // подтверждения (ст. 5 ФЗ «О рекламе»). Вернуть после подтверждения.
    inLanguage: "ru",
    numberOfCredits: COURSE.modules,
    educationalLevel: "Professional",
    about: [
      "Искусственный интеллект",
      "Банкротство физических лиц",
      "Юриспруденция",
      "LegalTech",
    ],
  };
}

function buildWebsiteSchema() {
  return {
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    inLanguage: "ru",
    publisher: buildOrganizationSchema(),
  };
}

function buildFAQSchema() {
  // Import FAQ inline to avoid circular — use static subset
  return {
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Нужно ли уметь программировать?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Нет! Мы учим работать с AI на естественном языке — никакого кода.",
        },
      },
      {
        "@type": "Question",
        name: "Безопасно ли загружать документы в AI?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "На курсе целый блок посвящён обезличиванию данных и работе с Enterprise-версиями нейросетей.",
        },
      },
      {
        "@type": "Question",
        name: "Есть гарантия возврата?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `100% возврат средств в первые ${COURSE.returnGuaranteeDays} дней, если курс не подойдёт.`,
        },
      },
    ],
  };
}

export default function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildWebsiteSchema(),
      buildOrganizationSchema(),
      buildCourseSchema(),
      buildFAQSchema(),
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Экранируем "<" → <: JSON.stringify не экранирует его, и значение с
      // "</script>" иначе разорвало бы контекст тега (XSS-латентность при будущих
      // динамических данных). Сейчас данные статичны, но это defense-in-depth.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
    />
  );
}
