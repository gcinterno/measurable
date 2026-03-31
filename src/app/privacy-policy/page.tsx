import Link from "next/link";

type PrivacyPolicySection = {
  title: string;
  content?: string[];
  bullets?: string[];
};

const sections: PrivacyPolicySection[] = [
  {
    title: "1. Information We Collect",
    content: [
      "We may collect the following types of information:",
    ],
    bullets: [
      "Account Information: Name, email address, and login credentials.",
      "Connected Data Sources: Page names and identifiers, performance metrics such as reach, engagement, and followers, plus content metadata required to generate reports.",
      "Uploaded Data: Files you upload such as CSV or Excel, and structured data used to generate reports.",
      "We do not collect private messages or personal user data from your audience.",
    ],
  },
  {
    title: "2. How We Use Information",
    content: [
      "We use your information strictly to generate automated reports, analyze and structure your data, and improve the performance and usability of the platform.",
      "We do not sell your data.",
      "We do not use your data for advertising purposes.",
    ],
  },
  {
    title: "3. Data Sharing",
    content: [
      "We do not share your personal or business data with third parties, except when required to operate the service, such as hosting providers, or when required by law.",
    ],
  },
  {
    title: "4. Data Storage and Security",
    content: [
      "We take reasonable technical and organizational measures to protect your data.",
      "Your data may be stored securely on cloud infrastructure providers.",
    ],
  },
  {
    title: "5. Third-Party Services",
    content: [
      "Our platform may integrate with third-party services such as Facebook (Meta). Your use of those services is also subject to their respective privacy policies.",
    ],
  },
  {
    title: "6. Data Retention",
    content: [
      "We retain your data only as long as necessary to provide the service.",
      "You may request deletion of your data at any time.",
    ],
  },
  {
    title: "7. Your Rights",
    bullets: [
      "Request access to your data",
      "Request correction or deletion",
      "Disconnect integrations at any time",
    ],
  },
  {
    title: "8. Contact",
    content: [
      "If you have any questions about this Privacy Policy, you can contact us at:",
      "[YOUR EMAIL]",
    ],
  },
  {
    title: "9. Updates",
    content: [
      "We may update this Privacy Policy from time to time.",
      "Changes will be posted on this page.",
    ],
  },
];

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Effective Date: March 30, 2026
          </p>
          <p className="mt-6 text-sm leading-7 text-slate-700 sm:text-base">
            Measurable (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates a software platform that allows users to connect their data sources and generate automated reports.
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base">
            This Privacy Policy explains how we collect, use, and protect your information when you use our platform.
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

                {section.bullets ? (
                  <ul className="mt-4 space-y-3">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-3 text-sm leading-7 text-slate-700 sm:text-base"
                      >
                        <span className="mt-2 h-2 w-2 rounded-full bg-sky-500" />
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
