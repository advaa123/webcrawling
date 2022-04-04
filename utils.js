export const getValidUrl = (link, url) => {
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

 export const saveResultListToJsonFile = (imagesObjList) => {
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