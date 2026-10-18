const axios = require("axios");
const cheerio = require("cheerio");
const logger = require("./logger");

const fetchRadio = async (page = 0) => {
  const BASE_URL = `https://onlineradiobox.com/id/?&p=${page}`;
  let arr = [];

  try {
    const radio = await axios.get(BASE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const $ = cheerio.load(radio.data);

    $("#stations")
      .find(".stations__station")
      .each((i, el) => {
        const findStation = $(el).find(".station_play");

        const getRadioName = $(el).find(".station__title__name").text().trim();
        const getRadioId = $(el).attr("radioid");
        let getRadioStream = findStation.attr("stream");
        let getRadioImg = findStation.attr("radioimg");

        if (!getRadioName || !getRadioStream) return;

        if (getRadioStream && getRadioStream.startsWith("//")) {
          getRadioStream = "https:" + getRadioStream;
        }

        if (getRadioImg && getRadioImg.startsWith("//")) {
          getRadioImg = "https:" + getRadioImg;
        }

        const radioObjects = {
          nativeRadioName: getRadioName,
          radioName: getRadioName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          radioId: getRadioId,
          streamURL: getRadioStream,
          radioImg: getRadioImg || "",
        };

        arr.push(radioObjects);
      });
  } catch (error) {
    logger.error(`Error scraping page ${page}:`, error);
  }

  return arr;
};

module.exports = { fetchRadio };
