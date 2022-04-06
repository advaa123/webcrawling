import json
import re
import sys
from urllib.request import urljoin, urlparse

import cssutils
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
    ".tiff",
    ".svg",
]

LOCATION = 'results.json'


# Section A - valid URLs

def root_url_exists(root):
    try:
        response = requests.get(root)
    except:
        return False
    return response.status_code == 200


def parse_url(url):
    parsed_url = urlparse(url)
    scheme = parsed_url.scheme

    if "http" not in scheme:
        if scheme == "":
            scheme = "http"
        else:
            return False

    if bool(parsed_url.netloc):
        return f"{scheme}://{parsed_url.netloc}{parsed_url.path}"
    return False


def is_valid_attr(attr, url):
    if(attr != "" and attr != None):
        attr = urljoin(url, attr)
        attr = parse_url(attr)
        if attr:
            return attr
    return False


def is_valid_img_extension(url):
    return any([url.endswith(e) for e in VALID_IMAGE_EXTENSIONS])


# Section B - Extracting images
# (img tags and background_images from other tags' styles)

def extract_images(bs_object, url, level):
    extract_img_tags(bs_object.findAll("img"), url, level)
    extract_background_images(bs_object.findAll(
        attrs={"style": True}), url, level)


def extract_img_tags(bs_images, url, level):
    img_set = set()
    for result in bs_images:
        img = result.attrs.get("src")
        img = is_valid_attr(img, url)
        add_final_image_to_global_images(img, img_set, url, level)


def extract_background_images(bs_background_images, url, level):
    if not bs_background_images:
        return

    bg_img_set = set()
    for tag in bs_background_images:
        style = cssutils.parseStyle(tag["style"], validate=False)
        background_image = style['background-image']

        if background_image:
            background_image_url = re.findall(
                r'\((.*?)\)', background_image)[0]
            background_image_url = parse_url(background_image_url)
            add_final_image_to_global_images(
                background_image_url, bg_img_set, url, level)


# Section C - Finalizing images
# - preparing images objects
# - adding them to the global images list
# - extracting everything to a JSON file

def add_final_image_to_global_images(img, img_set, url, level):
    if not img or img == "":
        return

    if is_valid_img_extension(img):
        if img not in img_set:
            img_set.add(img)
            img = get_final_img_obj(img, url, level)
            images.append(img)


def get_final_img_obj(img_url, source_url, depth):
    return {
        "imageUrl": img_url,
        "sourceUrl": source_url,
        "depth": depth
    }


def save_images_to_json_file(images):
    images = json.dumps({"results": images})

    try:
        with open(LOCATION, 'w') as outfile:
            outfile.write(images)
            print("Saved results to", LOCATION)
    except IOError:
        print("Failed to save JSON file to disk.")


# Section D - Links extraction

def extract_links(bs_links, url, temp_links):
    for result in bs_links:
        href = result.attrs.get("href")
        href = is_valid_attr(href, url)
        if href:
            if href not in links:
                # print("link -", href)
                links.add(href)
                temp_links.add(href)


# Section E - crawling logic

def level_crawler(input_url, level=0):
    temp_links = set()
    try:
        beautiful_soup_object = BeautifulSoup(
            requests.get(input_url).content, "lxml")
    except Exception as e:
        print(e)
        print("Couldn't make the request for", input_url)
        return []

    extract_images(beautiful_soup_object, input_url, level)

    bs_links = beautiful_soup_object.findAll("a")
    extract_links(bs_links, input_url, temp_links)

    return temp_links


def crawl(input_url, depth=0):
    queue = [input_url]
    links.add(input_url)
    for level in range(depth + 1):
        if (len(queue)):
            print(f"Crawling level {level}, please wait...")
            for _ in range(len(queue)):
                url = queue.pop(0)
                urls = level_crawler(url, level)
                if (len(urls)):
                    for i in urls:
                        queue.append(i)
        else:
            break

    print("Done!")
    save_images_to_json_file(images)


# Section F - CLI logic

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
