import { defaultBackend, defineSandbox } from "eve/sandbox";

export default defineSandbox({
  // Pick the best backend per environment: Vercel Sandbox on hosted Vercel,
  // Docker → microsandbox → just-bash locally. A pinned microsandbox() backend
  // fails on Vercel build containers (no /dev/kvm).
  backend: defaultBackend({
    vercel: { resources: { vcpus: 2 } },
    microsandbox: { memoryMiB: 2048 },
  }),
  revalidationKey: () => "f1-python-v1",
  async bootstrap({ use }) {
    const sandbox = await use();

    await sandbox.run({ command: "pip3 install --break-system-packages --quiet matplotlib pandas numpy 2>&1 | tail -3" });

    await sandbox.writeTextFile({
      path: "analysis/README.md",
      content: [
        "# F1 Analysis Sandbox",
        "",
        "Python 3.14 with matplotlib, pandas, and numpy pre-installed.",
        "Network access is DENIED. All data must be passed in as JSON files.",
        "",
        "## Usage",
        "",
        "1. Write your script to /workspace/analysis/script.py",
        "2. Data files are placed at /workspace/data/*.json",
        "3. Save charts to /workspace/output/*.png",
        "4. Run: python3 /workspace/analysis/script.py",
        "",
        "## Conventions",
        "",
        "- Read input data from /workspace/data/",
        "- Write charts to /workspace/output/",
        "- Print text results to stdout",
      ].join("\n"),
    });
  },
  async onSession({ use }) {
    const sandbox = await use();

    // Lock down egress for the live session: analysis runs on data passed
    // via dataJson, never the network. Bootstrap stays open so pip can install.
    await sandbox.setNetworkPolicy("deny-all");

    await sandbox.run({ command: "mkdir -p /workspace/data /workspace/output" });
  },
});
