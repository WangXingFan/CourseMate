import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const workspaceDir = resolve(packageDir, "../..");
const sourceFile = join(workspaceDir, "backend/docs/swagger.json");
const targetFile = join(packageDir, "src/types.generated.ts");
const outputName = "types.generated.ts";
const checkOnly = process.argv.includes("--check");
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--check");

if (unknownArguments.length > 0) {
  throw new Error(`Unknown arguments: ${unknownArguments.join(", ")}`);
}

function shortDefinitionName(name) {
  return name.split(".").at(-1);
}

function namespaceName(name) {
  const namespace = name.slice(0, name.lastIndexOf("."));
  const httpMarker = "internal_transport_http_";
  const segment = namespace.includes(httpMarker)
    ? namespace.slice(namespace.lastIndexOf(httpMarker) + httpMarker.length)
    : namespace.split("_").at(-1);
  const aliases = {
    promptpreset: "PromptPreset",
    usersettings: "UserSettings",
  };

  if (aliases[segment]) {
    return aliases[segment];
  }

  return segment
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function definitionNameMap(definitions) {
  const groups = new Map();

  for (const name of Object.keys(definitions)) {
    const shortName = shortDefinitionName(name);
    const names = groups.get(shortName) ?? [];
    names.push(name);
    groups.set(shortName, names);
  }

  const mapping = new Map();
  const generatedNames = new Set();

  for (const [shortName, names] of groups) {
    for (const name of names) {
      const generatedName = names.length === 1 ? shortName : `${namespaceName(name)}${shortName}`;
      if (generatedNames.has(generatedName)) {
        throw new Error(`Definition name collision after normalization: ${generatedName}`);
      }
      mapping.set(name, generatedName);
      generatedNames.add(generatedName);
    }
  }

  return mapping;
}

function rewriteReferences(value, mapping) {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteReferences(item, mapping));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const rewritten = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "$ref" && typeof item === "string" && item.startsWith("#/definitions/")) {
      const originalName = item.slice("#/definitions/".length);
      const generatedName = mapping.get(originalName);
      if (!generatedName) {
        throw new Error(`Unknown Swagger definition reference: ${originalName}`);
      }
      rewritten[key] = `#/definitions/${generatedName}`;
    } else {
      rewritten[key] = rewriteReferences(item, mapping);
    }
  }
  return rewritten;
}

function normalizeSwagger(swagger) {
  if (swagger.swagger !== "2.0") {
    throw new Error(`Expected Swagger 2.0, received ${swagger.swagger ?? "an unknown version"}`);
  }

  const definitions = swagger.definitions ?? {};
  const mapping = definitionNameMap(definitions);
  const normalizedDefinitions = {};

  for (const [originalName, definition] of Object.entries(definitions)) {
    normalizedDefinitions[mapping.get(originalName)] = definition;
  }

  return rewriteReferences({ ...swagger, definitions: normalizedDefinitions }, mapping);
}

function normalizeText(value) {
  return value.replaceAll("\r\n", "\n");
}

const temporaryDir = mkdtempSync(join(tmpdir(), "deeix-api-contract-"));

try {
  const normalizedSwaggerFile = join(temporaryDir, "swagger.normalized.json");
  const generatedDir = join(temporaryDir, "generated");
  const generatedFile = join(generatedDir, outputName);
  const swagger = JSON.parse(readFileSync(sourceFile, "utf8"));

  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(normalizedSwaggerFile, `${JSON.stringify(normalizeSwagger(swagger), null, 2)}\n`);

  const executable = process.platform === "win32" ? "swagger-typescript-api.cmd" : "swagger-typescript-api";
  const result = spawnSync(
    executable,
    [
      "generate",
      "--path",
      normalizedSwaggerFile,
      "--output",
      generatedDir,
      "--name",
      outputName,
      "--no-client",
      "--route-types",
      "--sort-types",
      "--silent",
    ],
    { cwd: packageDir, encoding: "utf8", stdio: "inherit" },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`swagger-typescript-api exited with status ${result.status}`);
  }

  const generated = normalizeText(readFileSync(generatedFile, "utf8")).replace("// @ts-nocheck\n", "");
  const banner = [
    "// Generated from backend/docs/swagger.json. Do not edit manually.",
    "// Run `pnpm api:generate` from the workspace root to regenerate.",
    "",
  ].join("\n");
  writeFileSync(generatedFile, `${banner}${generated}`);

  if (checkOnly) {
    if (!existsSync(targetFile)) {
      throw new Error("Generated API contract is missing. Run `pnpm api:generate`.");
    }
    const committed = normalizeText(readFileSync(targetFile, "utf8"));
    const expected = normalizeText(readFileSync(generatedFile, "utf8"));
    if (committed !== expected) {
      throw new Error("Generated API contract is stale. Run `pnpm api:generate` and commit the result.");
    }
    console.log("API contract is up to date.");
  } else {
    mkdirSync(dirname(targetFile), { recursive: true });
    copyFileSync(generatedFile, targetFile);
    console.log(`Generated ${targetFile.slice(workspaceDir.length + 1)}.`);
  }
} finally {
  rmSync(temporaryDir, { force: true, recursive: true });
}
