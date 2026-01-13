const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withIosModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      try {
        let contents = await fs.promises.readFile(file, 'utf8');
        
        // Define the NEW patch content (using DEFINES_MODULE = NO instead of CLANG_ENABLE_MODULES = NO)
        const patchCode = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
      if target.name == 'react-native-maps' || target.name == 'react-native-google-maps'
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end
    end
`;

        // Clean up previous attempts (if any) to ensure we have a clean state for replacement
        // We look for the marker of the PREVIOUS failed attempt: CLANG_ENABLE_MODULES'] = 'NO'
        if (contents.includes("config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'")) {
            // We need to replace the whole block that contains this.
            // Let's try to identify the block we inserted last time.
            const previousPatchRegex = /installer\.pods_project\.targets\.each do \|target\|\s+target\.build_configurations\.each do \|config\|\s+config\.build_settings\['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'\] = 'YES'\s+end\s+if target\.name == 'react-native-maps' \|\| target\.name == 'react-native-google-maps'\s+target\.build_configurations\.each do \|config\|\s+config\.build_settings\['CLANG_ENABLE_MODULES'\] = 'NO'\s+end\s+end\s+end/s;
            
            if (previousPatchRegex.test(contents)) {
                contents = contents.replace(previousPatchRegex, patchCode.trim());
            } else {
                 // Fallback: Use string replacement on the unique part if regex fails due to whitespace
                 const oldPart = `if target.name == 'react-native-maps' || target.name == 'react-native-google-maps'
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
        end
      end`;
                 const newPart = `if target.name == 'react-native-maps' || target.name == 'react-native-google-maps'
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end`;
                 contents = contents.replace(oldPart, newPart);
            }
        } 
        else if (contents.includes("config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'")) {
             // Maybe we have the VERY first patch only?
             // Or maybe we have the new patch already?
             if (contents.includes("config.build_settings['DEFINES_MODULE'] = 'NO'")) {
                 return config; // Already applied
             }
             
             // If we have the old simple patch, upgrade it.
             const oldSimplePatchRegex = /installer\.pods_project\.targets\.each do \|target\|\s+target\.build_configurations\.each do \|config\|\s+config\.build_settings\['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'\] = 'YES'\s+end\s+end/s;
             if (oldSimplePatchRegex.test(contents)) {
                 contents = contents.replace(oldSimplePatchRegex, patchCode.trim());
             }
        }
        else {
            // No patch yet, insert at start of post_install
            contents = contents.replace(/post_install do \|installer\|/, `post_install do |installer|${patchCode}`);
        }
        
        await fs.promises.writeFile(file, contents, 'utf8');
      } catch (error) {
        console.warn('Could not modify Podfile for modular headers:', error);
      }

      return config;
    },
  ]);
};

module.exports = withIosModularHeaders;
