import { SONG_URL } from "@/constants";
import axios from "axios";

export const searchSongs = async (query: string) => {
  try {
    const response = await axios.get(`${SONG_URL}/search/songs?q=${query}`);
    return response.data?.data?.results || [];
  } catch (error) {
    return [];
  }
};
