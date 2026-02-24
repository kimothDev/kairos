const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin: withAndroid16KBAlignment
 *
 * Ensures native .so libraries are aligned to 16KB LOAD segments,
 * required for Android 15+ devices with 16KB page size support.
 *
 * What this plugin does:
 *   1. Copies scripts/align_elf_segments.py → android/app/align_elf_segments.py
 *   2. Ensures useLegacyPackaging = false in packagingOptions.jniLibs
 *   3. Injects a Gradle helper that runs the Python script after mergeNativeLibs
 *      for all build variants (debug, release, etc.)
 *
 * Cross-platform: Python detection tries python3 → python → py (Windows launcher)
 *
 * See mdFiles/README_16KB_ALIGNMENT.md for full documentation.
 */
const withAndroid16KBAlignment = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

      // ── Step 1: Copy the Python alignment script to android/app/ ────────────
      const scriptSource = path.join(
        projectRoot,
        "scripts",
        "align_elf_segments.py",
      );
      const scriptDest = path.join(
        projectRoot,
        "android",
        "app",
        "align_elf_segments.py",
      );

      if (fs.existsSync(scriptSource)) {
        fs.mkdirSync(path.dirname(scriptDest), { recursive: true });
        fs.copyFileSync(scriptSource, scriptDest);
        // chmod 755 is silently ignored on Windows — safe to call on all platforms
        try {
          fs.chmodSync(scriptDest, "755");
        } catch (_) { }
      } else {
        console.warn(
          `[withAndroid16KBAlignment] ⚠️  Python script not found at: ${scriptSource}\n` +
          `  Make sure scripts/align_elf_segments.py exists in the project root.`,
        );
      }

      // ── Step 2: Patch android/app/build.gradle ───────────────────────────────
      const buildGradlePath = path.join(
        projectRoot,
        "android",
        "app",
        "build.gradle",
      );

      if (fs.existsSync(buildGradlePath)) {
        let content = fs.readFileSync(buildGradlePath, "utf-8");
        content = patchBuildGradle(content);
        fs.writeFileSync(buildGradlePath, content);
      }

      return config;
    },
  ]);
};

// ─────────────────────────────────────────────────────────────────────────────
// Gradle patching helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inject all 16KB alignment additions into the build.gradle content.
 * Each section is guarded so re-running expo prebuild is safe (idempotent).
 */
function patchBuildGradle(gradle) {
  gradle = injectHelperFunctions(gradle);
  gradle = ensureUseLegacyPackagingFalse(gradle);
  gradle = injectAfterEvaluateHook(gradle);
  return gradle;
}

/**
 * Guard sentinel: used to detect whether we've already injected the helpers.
 * Must be unique and stable across rebuilds.
 */
const HELPER_SENTINEL = "def findPython16KB()";

/**
 * Prepend the cross-platform Python finder + align16KBNativeLibs helper.
 *
 * Cross-platform notes:
 *   - Linux/macOS: `python3` is the standard name
 *   - Windows:     `python` or the `py` launcher (Python Launcher for Windows)
 *   - CI runners may only have `python3` or only `python`
 *   We try all three in order and use the first one that exits cleanly.
 *
 * libsDir path:
 *   Correct AGP 7.4+ path is:
 *     build/intermediates/merged_native_libs/{variant}/out/lib
 *   The old (broken) path mistakenly included the task name as a sub-folder.
 */
function injectHelperFunctions(gradle) {
  if (gradle.includes(HELPER_SENTINEL)) return gradle;

  const helperBlock = `
// ─── 16KB Page Alignment helpers (injected by withAndroid16KBAlignment) ──────

/**
 * Find a working Python 3 executable.
 * Tries: python3 (Linux/macOS), python (Windows/fallback), py (Windows launcher)
 */
def findPython16KB() {
    def candidates = ['python3', 'python', 'py']
    for (cmd in candidates) {
        try {
            def out = new ByteArrayOutputStream()
            def result = exec {
                commandLine cmd, '--version'
                standardOutput = out
                errorOutput = out
                ignoreExitValue = true
            }
            if (result.exitValue == 0) return cmd
        } catch (Exception ignored) {}
    }
    return null
}

/**
 * Post-processes all .so files in the merged native libs directory for a given
 * build variant, aligning their ELF LOAD segment p_align to 16KB (0x4000).
 *
 * Uses the correct AGP 7.4+ intermediate path:
 *   build/intermediates/merged_native_libs/{variant}/out/lib
 */
def align16KBNativeLibs(String buildVariant) {
    def pythonCmd = findPython16KB()
    if (pythonCmd == null) {
        println "[16KB Alignment] WARNING: Python not found. " +
                "Install Python 3 and ensure it is in PATH (try: python3 --version)."
        return
    }

    def scriptFile = file("\${projectDir}/align_elf_segments.py")
    if (!scriptFile.exists()) {
        println "[16KB Alignment] WARNING: align_elf_segments.py not found at \${scriptFile}. " +
                "Run 'expo prebuild' to copy it from scripts/align_elf_segments.py."
        return
    }

    // Correct path for AGP 7.4+ (no task-name sub-folder)
    def libsDir = file("\${buildDir}/intermediates/merged_native_libs/\${buildVariant}/out/lib")
    if (!libsDir.exists()) {
        println "[16KB Alignment] INFO: Native libs dir not found for variant '\${buildVariant}': \${libsDir}"
        return
    }

    println "[16KB Alignment] Processing libraries for variant: \${buildVariant}"

    def processed = 0
    def failed = 0
    libsDir.eachFileRecurse { soFile ->
        if (soFile.name.endsWith('.so')) {
            try {
                exec {
                    commandLine pythonCmd, scriptFile.absolutePath, soFile.absolutePath
                    ignoreExitValue = true
                }
                processed++
            } catch (Exception e) {
                println "[16KB Alignment] WARNING: Could not process \${soFile.name}: \${e.message}"
                failed++
            }
        }
    }

    if (processed > 0 || failed > 0) {
        println "[16KB Alignment] Done: \${processed} processed, \${failed} failed."
    }
}

// ─────────────────────────────────────────────────────────────────────────────

`;

  // Prepend before the rest of the file
  return helperBlock + gradle;
}

/**
 * Ensure useLegacyPackaging = false is set inside packagingOptions.jniLibs.
 * This is required for 16KB compatibility — libraries must NOT be extracted from APK.
 *
 * Expo already generates this block, so we just make sure the value is false.
 * If it's already false, we leave it untouched.
 */
function ensureUseLegacyPackagingFalse(gradle) {
  // Already correctly set — nothing to do
  if (/useLegacyPackaging\s*=\s*false/.test(gradle)) return gradle;

  // Replace any existing useLegacyPackaging assignment with false
  const replaced = gradle.replace(
    /useLegacyPackaging\s*=\s*(true|[^;\n]+)/g,
    "useLegacyPackaging = false",
  );

  // If nothing was replaced AND the packagingOptions block exists, inject into it
  if (replaced === gradle && gradle.includes("jniLibs {")) {
    return gradle.replace(
      /jniLibs\s*\{/,
      "jniLibs {\n            useLegacyPackaging = false",
    );
  }

  return replaced;
}

const AFTER_EVALUATE_SENTINEL =
  "Post-process native libraries for 16KB page alignment";

/**
 * Inject the afterEvaluate hook using android.applicationVariants.all.
 *
 * This is the reliable pattern recommended in the project README. It:
 *   - Hooks into EVERY build variant (debug, release, staging, etc.) automatically
 *   - Uses tasks.findByName() for safe task lookup (returns null if not found)
 *   - Works correctly with AGP 7.4+ task naming conventions
 *
 * Avoids the brittle tasks.matching{}.configureEach{} + .uncapitalize() pattern
 * that was in the previous version and would silently skip alignment.
 */
function injectAfterEvaluateHook(gradle) {
  if (gradle.includes(AFTER_EVALUATE_SENTINEL)) return gradle;

  const hook = `
/**
 * Post-process native libraries for 16KB page alignment.
 * Hooks into mergeNativeLibs for all build variants automatically.
 * (injected by withAndroid16KBAlignment Expo plugin)
 */
afterEvaluate {
    android.applicationVariants.all { variant ->
        def taskName = "merge\${variant.name.capitalize()}NativeLibs"
        def mergeTask = tasks.findByName(taskName)
        if (mergeTask) {
            mergeTask.doLast {
                align16KBNativeLibs(variant.name)
            }
        }
    }
}
`;

  return gradle + hook;
}

module.exports = withAndroid16KBAlignment;
