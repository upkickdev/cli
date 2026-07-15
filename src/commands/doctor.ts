import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pc from "picocolors";

const execFileAsync = promisify(execFile);

interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
}

//buraya bir yorum satırı/ publish. yml atla

async function commandVersion(
  command: string,
  args: string[] = ["--version"],
): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      windowsHide: true,
      timeout: 5_000,
    });

    return (stdout || stderr).trim().split(/\r?\n/u)[0] ?? null;
  } catch {
    return null;
  }
}

export async function collectDoctorChecks(): Promise<CheckResult[]> {
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  const [git, pnpm, npm] = await Promise.all([
    commandVersion("git"),
    commandVersion("pnpm"),
    commandVersion("npm"),
  ]);

  return [
    {
      label: "Node.js",
      ok: nodeMajor >= 20,
      detail: `v${process.versions.node}${nodeMajor >= 20 ? "" : " (Node.js 20+ required)"}`,
    },
    {
      label: "Git",
      ok: git !== null,
      detail: git ?? "not found",
    },
    {
      label: "pnpm",
      ok: pnpm !== null,
      detail: pnpm ?? "not found (optional)",
    },
    {
      label: "npm",
      ok: npm !== null,
      detail: npm ?? "not found",
    },
  ];
}

export async function runDoctor(): Promise<void> {
  console.log(pc.bold("Upkick Doctor"));
  console.log();

  const checks = await collectDoctorChecks();

  for (const check of checks) {
    const marker = check.ok ? pc.green("✓") : pc.red("✗");
    console.log(`${marker} ${pc.bold(check.label)} ${pc.dim(check.detail)}`);
  }

  const requiredChecks = checks.filter((check) => check.label !== "pnpm");
  const healthy = requiredChecks.every((check) => check.ok);

  console.log();
  console.log(
    healthy
      ? pc.green("Your environment is ready for Upkick.")
      : pc.red("Your environment needs attention before running Upkick."),
  );

  if (!healthy) {
    process.exitCode = 1;
  }
}
