import type { Express } from "express";
import { createServer, type Server } from "http";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

const PROMETHEUS_CLI = join(process.cwd(), "prometheus-obfuscator", "cli.lua");
const TEMP_DIR = join(process.cwd(), "temp");

const VALID_PRESETS = ["Weak", "Medium", "Strong", "Maximum"] as const;
type PresetLevel = typeof VALID_PRESETS[number];

const PRESET_MAP: Record<string, string> = {
  Weak: "Weak",
  Medium: "Medium",
  Strong: "Strong",
  Maximum: "Strong",
};

async function findLuaPath(): Promise<string> {
  const possiblePaths = [
    "lua",
    "lua5.1",
    "/nix/store/mqbhz05llkddfb5wni0m48kw22ixxps4-lua-5.1.5/bin/lua",
  ];

  for (const path of possiblePaths) {
    try {
      await execAsync(`${path} -v`, { timeout: 5000 });
      return path;
    } catch {
      continue;
    }
  }

  try {
    const { stdout } = await execAsync("find /nix/store -name 'lua' -type f 2>/dev/null | grep 'lua-5.1' | head -1", { timeout: 10000 });
    const foundPath = stdout.trim();
    if (foundPath) {
      return foundPath;
    }
  } catch {
    // Fall through to error
  }

  throw new Error("Lua interpreter not found. Please ensure Lua 5.1 is installed.");
}

async function ensureTempDir() {
  try {
    await mkdir(TEMP_DIR, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

let cachedLuaPath: string | null = null;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await ensureTempDir();

  try {
    cachedLuaPath = await findLuaPath();
    console.log(`Found Lua at: ${cachedLuaPath}`);
  } catch (error) {
    console.error("Warning: Could not find Lua interpreter on startup:", error);
  }

  app.post("/api/obfuscate", async (req, res) => {
    const { code, preset = "Strong" } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        error: "No code provided. Please enter Lua code to obfuscate.",
      });
    }

    const validatedPreset: PresetLevel = VALID_PRESETS.includes(preset as PresetLevel) 
      ? (preset as PresetLevel) 
      : "Strong";

    if (!cachedLuaPath) {
      try {
        cachedLuaPath = await findLuaPath();
      } catch (error: any) {
        return res.status(500).json({
          success: false,
          error: error.message || "Lua interpreter not found.",
        });
      }
    }

    const fileId = randomUUID();
    const inputFile = join(TEMP_DIR, `input_${fileId}.lua`);
    const outputFile = join(TEMP_DIR, `input_${fileId}.obfuscated.lua`);

    try {
      await writeFile(inputFile, code, "utf-8");

      const actualPreset = PRESET_MAP[validatedPreset] || "Strong";
      const command = `cd "${join(process.cwd(), "prometheus-obfuscator")}" && "${cachedLuaPath}" "${PROMETHEUS_CLI}" --preset ${actualPreset} "${inputFile}"`;
      
      await execAsync(command, {
        timeout: 120000,
        maxBuffer: 50 * 1024 * 1024,
      });

      const obfuscatedCode = await readFile(outputFile, "utf-8");

      try {
        await unlink(inputFile);
        await unlink(outputFile);
      } catch {
        // Cleanup errors are not critical
      }

      return res.json({
        success: true,
        obfuscatedCode,
        preset: validatedPreset,
      });
    } catch (error: any) {
      try {
        await unlink(inputFile);
        await unlink(outputFile);
      } catch {
        // Cleanup errors are not critical
      }

      console.error("Obfuscation error:", error);
      
      const errorMessage = error.stderr || error.message || "Unknown error during obfuscation";
      return res.status(500).json({
        success: false,
        error: `Obfuscation failed: ${errorMessage}`,
      });
    }
  });

  return httpServer;
}
