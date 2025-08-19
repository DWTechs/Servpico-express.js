import resolve from "@rollup/plugin-node-resolve";

const config =  {
  input: "build/es6/servpico-express.js",
  output: {
    name: "servpico",
    file: "build/servpico-express.cjs.js",
    format: "cjs"
  },
  external: [
  ],
  plugins: [
    resolve({
      mainFields: ['module', 'main']
    }),
  ]
};

export default config;