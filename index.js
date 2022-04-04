import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const URL = "http://google.com";
const seenUrls = new Set();
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

export const levelCrawl = async ({ url, depth }) => {
  console.log("crawling ", url);
  if (seenUrls.has(getUrl(url))) return;
  if (!url || url === undefined) return;

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
        depth,
      };
    })
    .get();

  addImagesObjectToList(images);

  const links = $("a")
    .map((_, link) => getUrl(link.attribs.href, url))
    .get();

  return links;
};

export const crawl = async ({ url, depth }) => {
  if (depth === 0) {
    levelCrawl({ url, depth });
  } else {
    const queue = [];
    queue.push(url);

    for (let j = 0; j < depth; j++) {
      for (let count = 0; count < queue.length; count++) {
        let link = queue.shift();
        let links = await levelCrawl({ url: link, depth: j });
        if (links !== undefined) {
          for (let i = 0; i < links.length; i++) {
            queue.push(links[i]);
          }
        } else {
          return saveResultListToJsonFile();
        }
      }
    }
  }
  return saveResultListToJsonFile();
};
