import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const seenUrls = new Set();
let imagesObjList = [];

const addImagesToResults = (results) => {
  // Adds the extracted images to the results (imagesObjList)
  imagesObjList.push(...results);
};

const saveResultListToJsonFile = () => {
  // Makes a JSON file out of the results list
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
  let newLink = link;

  if (link.includes("http")) {
    newLink = link;
  } else if (link.startsWith("/")) {
    newLink = `${url}${link}`;
  } else {
    newLink = `${url}/${link}`;
  }
  if (newLink.includes("#")) {
    newLink = newLink.split("#")[0];
  }
  if (newLink.endsWith("/")) return newLink.substring(0, newLink.length - 1);
  return newLink;
};

const extractImages = ($, url, depth) => {
  // Extracts the images from the page & returns a fitting object
  return $("img")
    .map((_, image) => {
      if (!image.attribs.src) return;
      return {
        imageUrl: image.attribs.src,
        sourceUrl: url,
        depth,
      };
    })
    .get();
};

const extractLinks = ($, url) => {
  // Extracts the links from the page & returns a unique list of them
  let links = $("a")
    .map((_, link) => getValidUrl(link.attribs.href, url))
    .get();

  return [...new Set(links)];
};

const levelCrawl = async ({ url, depth, getLinks }) => {
  // Web scraping logic - actual use of cheerio

  if (!url || url === undefined) return;
  if (seenUrls.has(getValidUrl(url))) return;

  console.log(`crawling... ${getValidUrl(url)} - level: ${depth}`);
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const images = extractImages($, url, depth);
    if (images.length) addImagesToResults(images);
    if (!getLinks) return;

    let links = extractLinks($, url);
    return links;
  } catch (error) {
    console.log(`Failed to fetch from ${getValidUrl(url)}`);
    return [];
  }
};

export const crawl = async ({ url, depth }) => {
  // Web scraping by depth logic

  if (depth === 0) {
    await levelCrawl({ url, depth });
  } else {
    const queue = [];
    queue.push(url);
    let level = 0;

    while (queue.length > 0 && level < depth) {
      let link = queue.shift();
      let links = await levelCrawl({ url: link, depth: level, getLinks: true });
      seenUrls.add(link);

      if (links !== undefined && links.length && level < depth) {
        level++;
        for (let i = 0; i < links.length; i++) {
          queue.push(links[i]);
          await levelCrawl({ url: links[i], depth: level, getLinks: false });
        }
      }
    }
  }
  return saveResultListToJsonFile();
};
