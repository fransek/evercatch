import typescript from "@rollup/plugin-typescript";

const input = "src/index.ts";

/** @type {() => import('rollup').RollupOptions} */
const createConfig = (format, dir) => ({
  input,
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
    }),
  ],
});

export default [
  createConfig("cjs", "dist/cjs"),
  createConfig("esm", "dist/esm"),
];
