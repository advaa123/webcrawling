import { crawl } from "./index.js";

console.log(process.argv);
if (process.argv.length > 2) {
  crawl({ url: process.argv[2], depth: parseInt(process.argv[3]) });
} else {
  console.log("error");
}
