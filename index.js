import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const URL = "http://google.com";
const seenUrls = new Set();

let depthCount = 0;
let imagesObjList = [];

const addImagesObjectToList = (results) => {
  imagesObjList.push(results);
};

const saveResultListToJsonFile = () => {
  fs.writeFile(
    "output.json",
    JSON.stringify({ results: imagesObjList }),
    "utf8",
    function (err) {
      if (err) {
        console.log("An error has occurred.");
        return console.log(error);
      }
      console.log("JSON file saved!");
    }
  );
};

const getUrl = (link, url) => {
  if (!link || link === undefined) return;
  if (link.includes("http")) return link;
  else if (link.startsWith("/")) {
    return `${url}${link}`;
  }
  return `${url}/${link}`;
};

export const crawl = async ({ url, depth }) => {
  console.log("crawling ", url);
  if (seenUrls.has(getUrl(url))) return;
  if (!url || url === undefined) return;

  console.log(url, depthCount);

  seenUrls.add(url);
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const images = $("img")
    .map((_, image) => {
      if (!image.attribs.src) return;
      return {
        imageUrl: getUrl(image.attribs.src, url),
        sourceUrl: url,
        depth: depthCount,
      };
    })
    .get();

  addImagesObjectToList(images);
  console.log("****", images);

  if (depthCount === depth) {
    return saveResultListToJsonFile();
  }

  const links = $("a")
    .map((_, link) => getUrl(link.attribs.href, url))
    .get();

  console.log(links);

  links.forEach((link) => {
    if (depthCount < depth) {
      depthCount++;
      crawl({ url: link, depth });
    }
  });
};

// crawl({ url: URL, depth: 0 });
