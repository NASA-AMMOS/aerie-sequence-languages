import {lezer} from "@lezer/generator/rollup"

export default {
  input: ".build/src/index.js",
  output: [{
    format: "es",
    file: "./dist/index.js"
  }, {
    format: "cjs",
    file: "./dist/index.cjs"
  }],
  external: ["@lezer/lr"],
  plugins: [lezer()]
}
