const config =  {
  input: "build/es6/servpico-express.js",
  output: {
    name: "servpico",
    file: "build/servpico-express.mjs",
    format: "es"
  },
  external: [
    "@dwtechs/winstan",
  ],
  plugins: []
};

export default config;
