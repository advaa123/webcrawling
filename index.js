import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const visitedLinks = new Set();
let imagesObjList = [];

const saveResultListToJsonFile = () => {
  // Makes a JSON file out of the results list
  fs.writeFile(
    "results.json",
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

const getValidUrl = (link, url) => {
  /** Returns a valid url to fetch from while crawling &
   * makes sure the stripped URL hasn't already been visited.
   *
   * Examples:
   *   getUrl("/about", "http://example.com") => "http://example.com/about"
   *   getUrl("http://example.com/1/#", "http://example.com") => "http://example.com/1"
   *   getUrl("http://example.com/", "http://example.com") => "http://example.com"
   */
  if (!link || link === undefined) return;

  let linkHyphens = (link.match(/\//g) || []).length;
  if (linkHyphens === 1) link = link.slice(1);

  let parsedLink = new URL(link, url);
  if (!parsedLink.protocol.includes("http")) return;

  link = `${parsedLink.protocol}//${parsedLink.host}${parsedLink.pathname}`;

  return link;
};

const extractImages = ($, url, depth) => {
  // Extracts the images from the page & returns a fitting object
  return $("img")
    .map((_, image) => {
      let img = getValidUrl(image.attribs.src, url);
      img &&
        imagesObjList.push({
          imageUrl: img,
          sourceUrl: url,
          depth,
        });
    })
    .get();
};

const extractLinks = ($, url) => {
  // Extracts the links from the page & returns a unique list of them
  let tempLinks = new Set();

  $("a")
    .map((_, link) => {
      const validLink = getValidUrl(link.attribs.href, url);
      if (!visitedLinks.has(validLink)) {
        visitedLinks.add(validLink);
        tempLinks.add(validLink);
      }
    })
    .get();

  return [...tempLinks];
};

const levelCrawl = async ({ url, depth }) => {
  // Web scraping logic - use of cheerio
  if (!url || url === undefined) return;
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    extractImages($, url, depth);
    let links = extractLinks($, url);
    return links || [];
  } catch (error) {
    console.log(`Failed to fetch from ${getValidUrl(url)}`);
    return [];
  }
};

export const crawl = async (inputUrl, depth = 0) => {
  // Web scraping by depth logic
  const queue = [];
  queue.push(inputUrl);
  visitedLinks.add(inputUrl);
  for (let level = 0; level < depth + 1; level++) {
    if (queue.length) {
      console.log(`Crawling level ${level}, please wait...`);
      for (let _ of Array(queue.length).keys()) {
        let url = queue.shift();
        let links = await levelCrawl({ url, depth: level });
        if (links?.length) {
          for (let link of links) {
            queue.push(link);
          }
        }
      }
    } else {
      break;
    }
  }
  console.log("Done!");
  return saveResultListToJsonFile();
};
