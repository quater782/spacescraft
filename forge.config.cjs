const path = require("node:path");
const { version } = require("./package.json");

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "SPACECRAFT",
    appBundleId: "com.spacecraft.twinstar",
    appCategoryType: "public.app-category.games",
    icon: path.join(__dirname, "assets", "icon"),
    ignore: [
      /^\/docs/,
      /^\/\.github/,
      /^\/CHANGELOG\.md$/,
      /^\/dist/,
      /^\/out/,
      /^\/node_modules\/three\/(?!build(?:$|\/three\.module\.min\.js$|\/three\.core\.min\.js$)|examples(?:$|\/jsm(?:$|\/(?:postprocessing|shaders)(?:$|\/))))/
    ],
    afterPrune: [(buildPath, _electronVersion, _platform, _arch, callback) => {
      try {
        require('./scripts/verify-package.cjs').verifyPackage(buildPath);
        callback();
      } catch (error) {
        callback(error);
      }
    }]
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      platforms: ["win32"],
      config: {
        name: "spacescraft",
        authors: "SPACECRAFT Team",
        description: "SPACECRAFT 星航双子",
        setupExe: `SPACECRAFT-${version}-windows-x64-Setup.exe`,
        setupIcon: path.join(__dirname, "assets", "icon.ico")
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin", "win32"]
    },
    {
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
      config: () => ({
        name: `SPACECRAFT ${version}`,
        format: "ULFO"
      })
    }
  ]
};
