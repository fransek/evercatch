import typescript from "@rollup/plugin-typescript";

/** @type {() => import('rollup').RollupOptions} */
const createConfig = (format, dir) => ({
  input: "src/index.ts",
  output: {
    dir,
    format,
    sourcemap: true,
    preserveModules: true,
  },
  plugins: [
    typescript({
      compilerOptions: {
        declarationDir: dir,
        emitDeclarationOnly: true,
      },
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
    }),
  ],
});

export default [
  createConfig("cjs", "dist/cjs"),
  createConfig("esm", "dist/esm"),
];
