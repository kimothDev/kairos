const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withAndroid16KBAlignment = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

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
        fs.chmodSync(scriptDest, "755");
      }

      const buildGradlePath = path.join(
        projectRoot,
        "android",
        "app",
        "build.gradle",
      );
      if (fs.existsSync(buildGradlePath)) {
        let content = fs.readFileSync(buildGradlePath, "utf-8");
        content = add16KBAlignmentToGradle(content);
        fs.writeFileSync(buildGradlePath, content);
      }

      return config;
    },
  ]);
};

function add16KBAlignmentToGradle(buildGradle) {
  // 1. Add Architecture Splits
  if (!buildGradle.includes("splits {")) {
    const splitsBlock = `
    splits {
        abi {
            reset()
            enable true
            universalApk false
            include "armeabi-v7a", "x86", "arm64-v8a", "x86_64"
        }
    }`;
    buildGradle = buildGradle.replace(
      /android\s*\{/,
      "android {" + splitsBlock,
    );
  }

  // 2. Add 16KB Alignment Helper Function
  if (!buildGradle.includes("def align16KBNativeLibs")) {
    const helperFunction = `
/**
 * Helper function to align native libraries to 16KB page size for Android 15+ compatibility  
 */
def align16KBNativeLibs(String buildVariant) {
    def taskName = "merge\${buildVariant.capitalize()}NativeLibs"
    def libsDir = file("\${buildDir}/intermediates/merged_native_libs/\${buildVariant}/\${taskName}/out/lib")
    
    if (!libsDir.exists()) {
        return
    }
    
    def pythonScript = file("\${projectDir}/align_elf_segments.py")
    if (!pythonScript.exists()) {
        return
    }
    
    libsDir.eachFileRecurse { file ->
        if (file.name.endsWith('.so')) {
            try {
                exec {
                    commandLine 'python', pythonScript.absolutePath, file.absolutePath
                    ignoreExitValue = true
                }
            } catch (Exception e) {}
        }
    }
}
`;
    buildGradle = helperFunction + "\n" + buildGradle;
  }

  // 3. Add CMake Flags and NDK filters
  const cmakeFlags = `
        externalNativeBuild {
            cmake {
                arguments "-DANDROID_LD=lld",
                          "-DCMAKE_SHARED_LINKER_FLAGS=-Wl,-z,max-page-size=16384",
                          "-DCMAKE_EXE_LINKER_FLAGS=-Wl,-z,max-page-size=16384"
            }
        }`;

  const ndkFilters = `
        ndk {
            abiFilters "armeabi-v7a", "x86", "arm64-v8a", "x86_64"
        }`;

  if (!buildGradle.includes("DCMAKE_SHARED_LINKER_FLAGS")) {
    buildGradle = buildGradle.replace(
      /defaultConfig\s*\{/,
      "defaultConfig {" + cmakeFlags + ndkFilters,
    );
  } else if (!buildGradle.includes("abiFilters")) {
    buildGradle = buildGradle.replace(
      /defaultConfig\s*\{/,
      "defaultConfig {" + ndkFilters,
    );
  }

  // 4. Set useLegacyPackaging
  buildGradle = buildGradle.replace(
    /useLegacyPackaging\s*[=(].*?\)?\n/g,
    "useLegacyPackaging = false\n",
  );

  // 5. Add afterEvaluate hook
  if (
    !buildGradle.includes(
      "Post-process native libraries for 16KB page alignment",
    )
  ) {
    const footerHook = `
/**
 * Post-process native libraries for 16KB page alignment
 */
afterEvaluate {
    tasks.matching { task ->
        task.name.contains('merge') && task.name.contains('NativeLibs')
    }.configureEach { mergeTask ->
        mergeTask.doLast {
            try {
                def variant = mergeTask.name.replaceFirst('merge', '').replaceFirst('NativeLibs', '').uncapitalize()
                align16KBNativeLibs(variant)
            } catch (Exception e) {}
        }
    }
}
`;
    buildGradle += footerHook;
  }

  return buildGradle;
}

module.exports = withAndroid16KBAlignment;
