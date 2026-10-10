import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

try {
  const response = await axios.get(
    "https://gnews.io/api/v4/search",
    {
      params: {
        q: "India",
        lang: "en",
        country: "in",
        max: 10,
        apikey: process.env.NEWS_API_KEY
      }
    }
  );

  console.log(
    JSON.stringify(response.data, null, 2)
  );

} catch (error) {

  console.log(
    error.response?.data || error.message
  );

}