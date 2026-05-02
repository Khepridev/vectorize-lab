import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation | PNG to SVG",
  description: "Usage guide and settings reference for PNG to SVG converter.",
};

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 md:py-20">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Documentation
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Complete guide for quality profiles, advanced controls, similarity score, and batch
            conversion.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back to App
        </Link>
      </header>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Quick Start</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Upload a PNG from the dropzone.</li>
          <li>Pick a quality profile (default is Ultra).</li>
          <li>Optionally enable advanced controls or smaller file mode.</li>
          <li>Review side-by-side preview and similarity score.</li>
          <li>Download a single SVG or convert multiple files as ZIP.</li>
        </ol>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Production Feature Priority
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          If you are deciding what is essential in production, prioritize by actual user value.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                <th className="py-2 pr-4">Feature</th>
                <th className="py-2 pr-4">Priority</th>
                <th className="py-2">Why</th>
              </tr>
            </thead>
            <tbody className="text-zinc-700 dark:text-zinc-300">
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-4 font-medium">Quality profile</td>
                <td className="py-2 pr-4">Required</td>
                <td className="py-2">Simple defaults reduce user decision load and support most flows.</td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-4 font-medium">Advanced controls</td>
                <td className="py-2 pr-4">Expert-only</td>
                <td className="py-2">Useful for edge cases and quality tuning, but too complex for most users.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Batch convert</td>
                <td className="py-2 pr-4">Scenario-based</td>
                <td className="py-2">Critical for bulk asset workflows, optional for single-file usage.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Quality Profiles</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">
                <th className="py-2 pr-4">Profile</th>
                <th className="py-2 pr-4">Best Use</th>
                <th className="py-2">Tradeoff</th>
              </tr>
            </thead>
            <tbody className="text-zinc-700 dark:text-zinc-300">
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-4 font-medium">Ultra</td>
                <td className="py-2 pr-4">Maximum visual fidelity</td>
                <td className="py-2">Largest SVG size, slowest processing</td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-4 font-medium">Balanced</td>
                <td className="py-2 pr-4">Everyday production usage</td>
                <td className="py-2">Slightly less detail than Ultra</td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-4 font-medium">Fast</td>
                <td className="py-2 pr-4">Quick iteration and drafts</td>
                <td className="py-2">Lower quality and path detail</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Pixel Art</td>
                <td className="py-2 pr-4">Hard-edged pixel graphics</td>
                <td className="py-2">Not ideal for soft gradients/photos</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Advanced Controls</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enable manual overrides to tune output quality. Start with Ultra, then adjust one slider
          at a time.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">
                <th className="py-2 pr-4">Control</th>
                <th className="py-2 pr-4">Effect</th>
                <th className="py-2">Tip</th>
              </tr>
            </thead>
            <tbody className="text-zinc-700 dark:text-zinc-300">
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-4 font-medium">Colors</td>
                <td className="py-2 pr-4">Palette depth and gradient accuracy</td>
                <td className="py-2">Higher improves fidelity but increases file size</td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-4 font-medium">ltres / qtres</td>
                <td className="py-2 pr-4">Line/curve fitting error thresholds</td>
                <td className="py-2">Lower keeps more detail</td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-4 font-medium">pathomit</td>
                <td className="py-2 pr-4">Removes short tiny paths</td>
                <td className="py-2">Set 0 for max detail retention</td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-4 font-medium">roundcoords</td>
                <td className="py-2 pr-4">Coordinate precision</td>
                <td className="py-2">Higher is more accurate, larger output</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Quant / Blur</td>
                <td className="py-2 pr-4">Color convergence and smoothing behavior</td>
                <td className="py-2">Keep blur low for sharp assets</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Best practice: start from `Ultra` or `Balanced`, then change one slider at a time and watch
          similarity + output size together.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Similarity Score</h2>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          The app rasterizes both the original PNG and generated SVG, then compares pixel
          differences. This gives a practical percentage estimate, not a strict visual truth metric.
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Guide: 98%+ near-identical, 94-97% very close, 90-93% good, below 90% needs tuning.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Batch ZIP</h2>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          Use batch mode to process multiple PNG files with the current settings and download all
          generated SVG files in one ZIP archive.
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Recommendation: finalize settings with one file first, then run batch for consistency.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Operational Notes</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>PNG files are validated by extension, MIME type, and header signature.</li>
          <li>Preview SVG content is sanitized before rendering for safer client display.</li>
          <li>Similarity score is a practical approximation, not a perceptual quality oracle.</li>
          <li>For large batches, monitor browser memory and process in smaller chunks if needed.</li>
        </ul>
      </section>
    </main>
  );
}
