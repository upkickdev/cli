import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";

import { extract } from "tar";

const TEMPLATES_OWNER = "upkickdev";
const TEMPLATES_REPOSITORY = "templates";
const TEMPLATES_BRANCH = "main";

const TEMPLATE_INDEX_URL =
  `https://raw.githubusercontent.com/` +
  `${TEMPLATES_OWNER}/${TEMPLATES_REPOSITORY}/` +
  `${TEMPLATES_BRANCH}/templates.json`;

export interface RunCreateCommandOptions {
  projectName: string;
  template: string;
  version?: string;
  directory?: string;
  overwrite: boolean;
  install: boolean;
  git: boolean;
}

interface TemplateIndex {
  schemaVersion: number;
  templates: Record<string, TemplateIndexEntry>;
}

interface TemplateIndexEntry {
  name: string;
  description: string;
  latest: string;
  status: "stable" | "beta" | "alpha" | "deprecated";
  default: boolean;
  category: string;
  tags: string[];
  release: {
    tag: string;
    archive: string;
    checksum: string;
    metadata: string;
  };
}

interface TemplateMetadata {
  schemaVersion: number;
  id: string;
  name: string;
  description: string;
  version: string;
  status: "stable" | "beta" | "alpha" | "deprecated";
  default: boolean;
  category: string;
  tags: string[];
  requirements: {
    node: string;
    packageManagers: string[];
  };
  defaults: {
    packageManager: string;
    installDependencies: boolean;
    initializeGit: boolean;
  };
}

interface GeneratedProjectMetadata {
  schemaVersion: number;
  template: {
    id: string;
    name: string;
    version: string;
  };
  generatedBy: {
    name: string;
    version: string;
  };
  createdAt: string;
}

export async function runCreateCommand(options: RunCreateCommandOptions): Promise<void> {
  const projectName = normalizeProjectName(options.projectName);
  const templateId = normalizeTemplateId(options.template);

  const destinationDirectory = resolveDestinationDirectory({
    projectName,
    ...(options.directory !== undefined ? { parentDirectory: options.directory } : {}),
  });

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "upkick-create-"));

  let destinationPrepared = false;

  try {
    console.log("Loading template index...");

    const templateIndex = await fetchTemplateIndex();
    const template = getTemplateEntry(templateIndex, templateId);

    ensureTemplateCanBeUsed(templateId, template);

    const selectedVersion = options.version ?? template.latest;
    const releaseTag = resolveReleaseTag({
      templateId,
      selectedVersion,
      template,
      explicitVersion: options.version !== undefined,
    });

    const archiveName = template.release.archive;
    const checksumName = template.release.checksum;

    const archivePath = path.join(temporaryDirectory, archiveName);

    const checksumPath = path.join(temporaryDirectory, checksumName);

    const releaseBaseUrl =
      `https://github.com/${TEMPLATES_OWNER}/` +
      `${TEMPLATES_REPOSITORY}/releases/download/${releaseTag}`;

    console.log(`Creating "${projectName}" from ${templateId} v${selectedVersion}...`);

    await prepareDestinationDirectory({
      destinationDirectory,
      overwrite: options.overwrite,
    });

    destinationPrepared = true;

    console.log("Downloading template...");

    await downloadFile(`${releaseBaseUrl}/${archiveName}`, archivePath);

    await downloadFile(`${releaseBaseUrl}/${checksumName}`, checksumPath);

    console.log("Verifying template archive...");

    await verifyArchiveChecksum({
      archivePath,
      checksumPath,
      expectedArchiveName: archiveName,
    });

    console.log("Extracting template...");

    await extract({
      file: archivePath,
      cwd: destinationDirectory,
      strict: true,
    });

    const templateMetadata = await readTemplateMetadata(destinationDirectory);

    validateExtractedTemplate({
      metadata: templateMetadata,
      expectedTemplateId: templateId,
      expectedVersion: selectedVersion,
    });

    await createProjectMetadata({
      destinationDirectory,
      templateMetadata,
    });

    await removeTemplateMetadata(destinationDirectory);

    console.log("");
    console.log("Project created successfully.");
    console.log("");
    console.log(`  Template:  ${templateMetadata.name}`);
    console.log(`  Version:   ${templateMetadata.version}`);
    console.log(`  Directory: ${formatDirectoryForOutput(destinationDirectory)}`);
    console.log("");
    console.log("Next steps:");
    console.log(`  cd ${formatDirectoryForOutput(destinationDirectory)}`);

    if (options.install) {
      console.log(`  ${templateMetadata.defaults.packageManager} install`);
    }
  } catch (error) {
    if (destinationPrepared) {
      await rm(destinationDirectory, {
        recursive: true,
        force: true,
      });
    }

    throw normalizeError(error);
  } finally {
    await rm(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
}

function normalizeProjectName(projectName: string): string {
  const normalizedName = projectName.trim();

  if (!normalizedName) {
    throw new Error("Project name is required.");
  }

  if (
    normalizedName === "." ||
    normalizedName === ".." ||
    normalizedName.includes("/") ||
    normalizedName.includes("\\")
  ) {
    throw new Error("Project name must be a valid directory name.");
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(normalizedName)) {
    throw new Error(
      "Project name may only contain letters, numbers, dots, underscores, and hyphens.",
    );
  }

  return normalizedName;
}

function normalizeTemplateId(templateId: string): string {
  const normalizedId = templateId.trim().toLowerCase();

  if (!/^[a-z0-9-]+$/.test(normalizedId)) {
    throw new Error(`Invalid template ID "${templateId}".`);
  }

  return normalizedId;
}

function resolveDestinationDirectory({
  projectName,
  parentDirectory,
}: {
  projectName: string;
  parentDirectory?: string;
}): string {
  const baseDirectory = parentDirectory
    ? path.resolve(process.cwd(), parentDirectory)
    : process.cwd();

  return path.join(baseDirectory, projectName);
}

async function fetchTemplateIndex(): Promise<TemplateIndex> {
  const response = await fetch(TEMPLATE_INDEX_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "@upkick/cli",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not load template index: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (!isTemplateIndex(data)) {
    throw new Error("The remote template index has an invalid structure.");
  }

  return data;
}

function isTemplateIndex(value: unknown): value is TemplateIndex {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TemplateIndex>;

  return (
    typeof candidate.schemaVersion === "number" &&
    candidate.templates !== null &&
    typeof candidate.templates === "object"
  );
}

function getTemplateEntry(index: TemplateIndex, templateId: string): TemplateIndexEntry {
  const template = index.templates[templateId];

  if (!template) {
    const availableTemplates = Object.keys(index.templates).sort().join(", ");

    throw new Error(
      [
        `Template "${templateId}" was not found.`,
        availableTemplates
          ? `Available templates: ${availableTemplates}`
          : "No templates are currently available.",
      ].join("\n"),
    );
  }

  return template;
}

function ensureTemplateCanBeUsed(templateId: string, template: TemplateIndexEntry): void {
  if (template.status === "deprecated") {
    throw new Error(`Template "${templateId}" is deprecated and cannot be used.`);
  }
}

function resolveReleaseTag({
  templateId,
  selectedVersion,
  template,
  explicitVersion,
}: {
  templateId: string;
  selectedVersion: string;
  template: TemplateIndexEntry;
  explicitVersion: boolean;
}): string {
  validateVersion(selectedVersion);

  if (!explicitVersion) {
    return template.release.tag;
  }

  return `${templateId}-v${selectedVersion}`;
}

function validateVersion(version: string): void {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid template version "${version}". Expected format: 1.2.3`);
  }
}

async function prepareDestinationDirectory({
  destinationDirectory,
  overwrite,
}: {
  destinationDirectory: string;
  overwrite: boolean;
}): Promise<void> {
  const exists = await pathExists(destinationDirectory);

  if (!exists) {
    await mkdir(destinationDirectory, {
      recursive: true,
    });

    return;
  }

  const entries = await readdir(destinationDirectory);

  if (entries.length === 0) {
    return;
  }

  if (!overwrite) {
    throw new Error(
      [
        `Target directory is not empty: ${destinationDirectory}`,
        "Use --overwrite to replace it.",
      ].join("\n"),
    );
  }

  await rm(destinationDirectory, {
    recursive: true,
    force: true,
  });

  await mkdir(destinationDirectory, {
    recursive: true,
  });
}

async function downloadFile(url: string, destinationPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/octet-stream",
      "User-Agent": "@upkick/cli",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Template release file was not found:\n${url}`);
    }

    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error(`Download returned an empty response: ${url}`);
  }

  await pipeline(response.body, createWriteStream(destinationPath));
}

async function verifyArchiveChecksum({
  archivePath,
  checksumPath,
  expectedArchiveName,
}: {
  archivePath: string;
  checksumPath: string;
  expectedArchiveName: string;
}): Promise<void> {
  const checksumContents = await readFile(checksumPath, "utf8");

  const firstLine = checksumContents.trim().split(/\r?\n/, 1)[0];

  if (!firstLine) {
    throw new Error("Checksum file is empty.");
  }

  const match = firstLine.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);

  if (!match) {
    throw new Error("Checksum file has an invalid format.");
  }

  const expectedChecksum = match[1];
  const archiveName = match[2];

  if (expectedChecksum === undefined || archiveName === undefined) {
    throw new Error("Checksum file does not contain the expected values.");
  }
  if (archiveName !== expectedArchiveName) {
    throw new Error(
      [
        "Checksum archive name does not match.",
        `Expected: ${expectedArchiveName}`,
        `Received: ${archiveName}`,
      ].join("\n"),
    );
  }

  const actualChecksum = await calculateSha256(archivePath);

  if (actualChecksum.toLowerCase() !== expectedChecksum.toLowerCase()) {
    throw new Error("Template archive checksum verification failed.");
  }
}

async function calculateSha256(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

async function readTemplateMetadata(destinationDirectory: string): Promise<TemplateMetadata> {
  const metadataPath = path.join(destinationDirectory, "upkick.template.json");

  let contents: string;

  try {
    contents = await readFile(metadataPath, "utf8");
  } catch {
    throw new Error("The extracted template does not contain upkick.template.json.");
  }

  let metadata: unknown;

  try {
    metadata = JSON.parse(contents);
  } catch {
    throw new Error("The extracted upkick.template.json file contains invalid JSON.");
  }

  if (!isTemplateMetadata(metadata)) {
    throw new Error("The extracted template metadata has an invalid structure.");
  }

  return metadata;
}

function isTemplateMetadata(value: unknown): value is TemplateMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TemplateMetadata>;

  return (
    typeof candidate.schemaVersion === "number" &&
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.version === "string" &&
    typeof candidate.status === "string" &&
    candidate.requirements !== null &&
    typeof candidate.requirements === "object" &&
    candidate.defaults !== null &&
    typeof candidate.defaults === "object"
  );
}

function validateExtractedTemplate({
  metadata,
  expectedTemplateId,
  expectedVersion,
}: {
  metadata: TemplateMetadata;
  expectedTemplateId: string;
  expectedVersion: string;
}): void {
  if (metadata.id !== expectedTemplateId) {
    throw new Error(
      [
        "Extracted template ID does not match the requested template.",
        `Expected: ${expectedTemplateId}`,
        `Received: ${metadata.id}`,
      ].join("\n"),
    );
  }

  if (metadata.version !== expectedVersion) {
    throw new Error(
      [
        "Extracted template version does not match the requested version.",
        `Expected: ${expectedVersion}`,
        `Received: ${metadata.version}`,
      ].join("\n"),
    );
  }
}

async function createProjectMetadata({
  destinationDirectory,
  templateMetadata,
}: {
  destinationDirectory: string;
  templateMetadata: TemplateMetadata;
}): Promise<void> {
  const upkickDirectory = path.join(destinationDirectory, ".upkick");

  await mkdir(upkickDirectory, {
    recursive: true,
  });

  const projectMetadata: GeneratedProjectMetadata = {
    schemaVersion: 1,
    template: {
      id: templateMetadata.id,
      name: templateMetadata.name,
      version: templateMetadata.version,
    },
    generatedBy: {
      name: "@upkick/cli",
      version: "0.1.0",
    },
    createdAt: new Date().toISOString(),
  };

  await writeFile(
    path.join(upkickDirectory, "project.json"),
    `${JSON.stringify(projectMetadata, null, 2)}\n`,
    "utf8",
  );
}

async function removeTemplateMetadata(destinationDirectory: string): Promise<void> {
  await rm(path.join(destinationDirectory, "upkick.template.json"), {
    force: true,
  });
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function formatDirectoryForOutput(destinationDirectory: string): string {
  const relativeDirectory = path.relative(process.cwd(), destinationDirectory);

  return relativeDirectory || ".";
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("An unexpected error occurred.");
}
