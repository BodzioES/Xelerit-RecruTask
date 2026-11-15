const steps = [
  {
    title: "Choose the service",
    body: "Self Drive for the van alone, Van + Driver for transport, or Full Moving with a crew. Each card lists what is included and how the price is built.",
  },
  {
    title: "Set the date and the addresses",
    body: "Pick the rental window or the loading date, then type an address or drop a pin on the map. The site checks the point against our service area before you continue.",
  },
  {
    title: "Review the quote",
    body: "The server calculates hours, route distance, the van, the movers, floors and elevator access. Every line is listed before you confirm.",
  },
  {
    title: "Confirm as a guest",
    body: "No account and no online payment. You receive a booking number and a private link to a page where the job status is updated.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="how-it-works-heading"
            className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl"
          >
            How our company works
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-500">
            The whole process happens in the browser: you check availability, see the real price
            and confirm the date yourself. Nothing is charged online, and you can call us at any
            point.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <span
                aria-hidden="true"
                className="inline-flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
              >
                {index + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
