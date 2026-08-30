const path = require("node:path");

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
      /^\/node_modules\/three\/(?!build(?:$|\/three\.module\.min\.js$)|examples(?:$|\/jsm(?:$|\/(?:postprocessing|shaders)(?:$|\/))))/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "spacescraft",
        authors: "SPACECRAFT Team",
        description: "SPACECRAFT 星航双子"
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"]
    }
  ]
};
