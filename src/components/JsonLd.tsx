import { SITE, COURSE, TARIFFS, EXPERTS } from "@/data/content";

function buildOrganizationSchema() {
  return {
    "@type": "Organization",
    name: SITE.fullName,
    url: SITE.url,
    logo: `${SITE.url}/favicon.jpg`,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Москва",
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
      "Практический курс по внедрению нейросетей в юридическую практику. ChatGPT, Claude, Midjourney — промпты и методики для юристов.",
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
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "9.2",
      bestRating: "10",
      ratingCount: "500",
    },
    inLanguage: "ru",
    numberOfCredits: COURSE.modules,
    educationalLevel: "Professional",
    about: [
      "Искусственный интеллект",
      "Юриспруденция",
      "LegalTech",
      "Промпт-инженерия",
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
