import json
import sys
from urllib.request import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


links = set()
images = []

VALID_IMAGE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".tiff"
]

LOCATION = 'results.json'


def is_valid_img_extension(url):
    return any([url.endswith(e) for e in VALID_IMAGE_EXTENSIONS])


def is_valid_attr(attr, url):
    if(attr != "" and attr != None):
        attr = urljoin(url, attr)
        attr_parsed = urlparse(attr)
        attr = f"{attr_parsed.scheme}://{attr_parsed.netloc}{attr_parsed.path}"
        attr_parsed = urlparse(attr)
        is_valid = attr_parsed.scheme.startswith(
            "http") and bool(attr_parsed.netloc)
        if (is_valid):
            return attr
    return False


def extract_images(bs_images, url, level):
    for result in bs_images:
        img = result.attrs.get("src")
        img = is_valid_attr(img, url)
        if img:
            if is_valid_img_extension(img):
                img = {
                    "imageUrl": img,
                    "sourceUrl": url,
                    "depth": level
                }
                images.append(img)


def extract_links(bs_links, url, temp_links):
    for result in bs_links:
        href = result.attrs.get("href")
        href = is_valid_attr(href, url)
        if href:
            if href not in links:
                print("link -", href)
                links.add(href)
                temp_links.add(href)


def save_images_to_json_file(images):
    images = json.dumps({"results": images})

    try:
        with open(LOCATION, 'w') as outfile:
            outfile.write(images)
            print("Saved results to", LOCATION)
    except IOError:
        print("Failed to save JSON file to disk.")


def level_crawler(input_url, level=0):
    temp_links = set()
    try:
        beautiful_soup_object = BeautifulSoup(
            requests.get(input_url).content, "lxml")
    except Exception as e:
        print(e)
        print("Couldn't make the request for", input_url)
        return []

    bs_images = beautiful_soup_object.findAll("img")
    extract_images(bs_images, input_url, level)

    bs_links = beautiful_soup_object.findAll("a")
    extract_links(bs_links, input_url, temp_links)

    return temp_links


def crawl(input_url, depth=0):
    queue = []
    queue.append(input_url)
    links.add(input_url)
    for level in range(depth + 1):
        if (len(queue)):
            print(f"Crawling level {level}, please wait...")
            for _ in range(len(queue)):
                url = queue.pop(0)
                urls = level_crawler(url, level)
                if (len(url)):
                    for i in urls:
                        queue.append(i)
        else:
            print("Done! There are not more websites to crawl!")
            break

    save_images_to_json_file(images)


def root_url_exists(root):
    try:
        response = requests.get(root)
    except:
        return False
    return response.status_code == 200


def main():
    if len(sys.argv) == 1:
        print("* python crawler.py <url> <depth>")
        print("** <url>: string (example - http://www.google.com)")
        print("** <depth>: int (default to zero)")
    else:
        input_url = urlparse(sys.argv[1])
        depth = 0

        if (input_url.scheme and input_url.netloc):
            if not root_url_exists(sys.argv[1]):
                print("Invalid URL.")
                print("Couldn't make the request for", sys.argv[1])
                return

            if len(sys.argv) > 2:
                if (sys.argv[1]):
                    try:
                        depth = int(sys.argv[2])
                    except ValueError:
                        print("Depth argument must be of type integer")
                        return

            crawl(sys.argv[1], depth)
        else:
            print("Invalid URL input. Valid URL example: http://www.google.com")
    return


main()
