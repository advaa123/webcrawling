import { crawl } from "./index.js";

if (process.argv.length > 2) {
  let depth = parseInt(process.argv[3]) || 0;
  crawl(process.argv[2], depth);
} else {
  console.log("error");
}
