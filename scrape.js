const axios = require("axios");
const cheerio = require("cheerio");

const fetchRadio = async (page = 0) => {
  const BASE_URL = `https://onlineradiobox.com/id/?p=${page}`;

  let arr = [];

  const radio = await axios.get(BASE_URL);
  const $ = cheerio.load(radio.data);

  $("#stations")
    .find(".stations__station")
    .each((i, el) => {
      const getRadioStream = $(el).find(".station_play").attr("stream");
      const getRadioName = $(el).find(".station_play").attr("radioname");
      const getRadioImg = $(el).find(".station_play").attr("radioimg");

      const radioObjects = {
        radioName: getRadioName,
        streamURL: getRadioStream,
        radioImg: "https:" + getRadioImg,
      };

      arr.push(radioObjects);
    });

  return arr;
};

module.exports = { fetchRadio };
