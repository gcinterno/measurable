import Link from "next/link";

type TermsSection = {
  title: string;
  content?: string[];
  bullets?: string[];
  secondaryTitle?: string;
  secondaryBullets?: string[];
};

const sections: TermsSection[] = [
  {
    title: "1. Description of Service",
    content: [
      "Measurable provides a software platform that allows users to connect data sources and generate automated reports.",
      "The service may include integrations with third-party platforms such as Facebook (Meta), as well as data processing tools and export features.",
    ],
  },
  {
    title: "2. Eligibility",
    content: [
      "You must be at least 18 years old to use the service.",
      "By using Measurable, you confirm that you have the authority to connect and use any data sources associated with your account.",
    ],
  },
  {
    title: "3. User Responsibilities",
    content: ["You agree to:"],
    bullets: [
      "Provide accurate account information",
      "Use the platform in compliance with applicable laws",
      "Only connect accounts and data you are authorized to use",
    ],
    secondaryTitle: "You agree NOT to:",
    secondaryBullets: [
      "Use the platform for illegal or unauthorized purposes",
      "Attempt to disrupt or abuse the service",
      "Reverse engineer or exploit the platform",
    ],
  },
  {
    title: "4. Data and Integrations",
    content: [
      "By connecting third-party services such as Facebook, you grant Measurable permission to access and process data required to generate reports.",
      "You retain ownership of your data.",
      "Measurable only processes your data to provide the service.",
    ],
  },
  {
    title: "5. Intellectual Property",
    content: [
      "All platform content, design, and functionality are the property of Measurable.",
      "You may not copy, reproduce, or distribute any part of the platform without permission.",
    ],
  },
  {
    title: "6. Service Availability",
    content: [
      "We aim to provide a reliable service, but we do not guarantee uninterrupted or error-free operation.",
      "We may update, modify, or discontinue features at any time.",
    ],
  },
  {
    title: "7. Limitation of Liability",
    content: [
      "Measurable is provided \"as is\" without warranties of any kind.",
      "We are not responsible for:",
    ],
    bullets: [
      "Data inaccuracies from third-party platforms",
      "Business decisions made based on generated reports",
      "Any indirect or consequential damages",
    ],
  },
  {
    title: "8. Termination",
    content: [
      "We reserve the right to suspend or terminate your access if you violate these Terms.",
      "You may stop using the service at any time.",
    ],
  },
  {
    title: "9. Changes to Terms",
    content: [
      "We may update these Terms from time to time. Continued use of the service means you accept the updated Terms.",
    ],
  },
  {
    title: "10. Contact",
    content: [
      "For questions about these Terms, contact:",
      "[YOUR EMAIL]",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-slate-950">
      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8 lg:px-10 lg:py-14">
        <Link
          href="/"
          className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back to Home
        </Link>

        <section className="mt-6 rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Effective Date: March 30, 2026
          </p>
          <p className="mt-6 text-sm leading-7 text-slate-700 sm:text-base">
            Welcome to Measurable. By accessing or using our platform, you agree to the following Terms of Service.
          </p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                  {section.title}
                </h2>

                {section.content?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 text-sm leading-7 text-slate-700 sm:text-base"
                  >
                    {paragraph}
                  </p>
                ))}

                {section.bullets && (
                  <ul className="mt-4 space-y-3">
                    {section.bullets.map((bullet, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm leading-7 text-slate-700 sm:text-base"
                      >
                        <span className="mt-2 h-2 w-2 rounded-full bg-sky-500" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {"secondaryTitle" in section && section.secondaryTitle ? (
                  <p className="mt-6 text-sm font-semibold text-slate-950">
                    {section.secondaryTitle}
                  </p>
                ) : null}

                {"secondaryBullets" in section && section.secondaryBullets ? (
                  <ul className="mt-4 space-y-3">
                    {section.secondaryBullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-3 text-sm leading-7 text-slate-700 sm:text-base"
                      >
                        <span className="mt-2 h-2 w-2 rounded-full bg-slate-400" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
