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
  if (buildGradle.includes("def align16KBNativeLibs")) {
    return buildGradle;
  }

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

  const cmakeFlags = `
        externalNativeBuild {
            cmake {
                arguments "-DANDROID_LD=lld",
                          "-DCMAKE_SHARED_LINKER_FLAGS=-Wl,-z,max-page-size=16384",
                          "-DCMAKE_EXE_LINKER_FLAGS=-Wl,-z,max-page-size=16384"
            }
        }`;

  if (!buildGradle.includes("DCMAKE_SHARED_LINKER_FLAGS")) {
    buildGradle = buildGradle.replace(
      /defaultConfig\s*\{/,
      "defaultConfig {" + cmakeFlags,
    );
  }

  // Improved regex for useLegacyPackaging
  buildGradle = buildGradle.replace(
    /useLegacyPackaging\s*[=(].*?\)?\n/g,
    "useLegacyPackaging = false\n",
  );

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

  return buildGradle;
}

module.exports = withAndroid16KBAlignment;
