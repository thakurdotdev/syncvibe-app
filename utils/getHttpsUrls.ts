import { Song, Artist, ImageQuality, DownloadQuality } from "@/types/song";

/**
 * Converts any HTTP URL to HTTPS URL
 */
const convertToHttps = (url: string): string => {
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
};

/**
 * Ensures all ImageQuality links use HTTPS
 */
const ensureHttpsForImages = (images?: ImageQuality[]): ImageQuality[] => {
  if (!images) return [];
  return images.map((img) => ({
    ...img,
    link: convertToHttps(img.link),
  }));
};

/**
 * Ensures all artists' URLs and image links use HTTPS
 */
const ensureHttpsForArtists = (artists?: Artist[]): Artist[] => {
  if (!artists) return [];
  return artists.map((artist) => ({
    ...artist,
    url: convertToHttps(artist.url),
    image: ensureHttpsForImages(artist.image),
  }));
};

/**
 * Ensures all DownloadQuality links use HTTPS
 */
const ensureHttpsForDownloadUrls = (
  downloadUrls?: DownloadQuality[],
): DownloadQuality[] => {
  if (!downloadUrls) return [];
  return downloadUrls.map((item) => ({
    ...item,
    link: convertToHttps(item.link),
  }));
};

/**
 * Ensures all URLs in a song object use HTTPS instead of HTTP
 */
export const ensureHttpsForSongUrls = (song: Song): Song => {
  return {
    ...song,
    url: convertToHttps(song.url),
    image: ensureHttpsForImages(song.image),
    artist_map: {
      artists: ensureHttpsForArtists(song.artist_map?.artists),
      featured_artists: ensureHttpsForArtists(
        song.artist_map?.featured_artists,
      ),
      primary_artists: ensureHttpsForArtists(song.artist_map?.primary_artists),
    },
    album_url: convertToHttps(song.album_url),
    label_url: convertToHttps(song.label_url),
    download_url: ensureHttpsForDownloadUrls(song.download_url),
  };
};

/**
 * Ensures all URLs in an album object use HTTPS
 */
export const ensureHttpsForAlbumUrls = (album: any): any => {
  if (!album) return album;

  return {
    ...album,
    url: convertToHttps(album.url),
    image: ensureHttpsForImages(album.image),
    artists: ensureHttpsForArtists(album.artists),
    artist: album.artist
      ? {
          ...album.artist,
          url: convertToHttps(album.artist.url),
          image: ensureHttpsForImages(album.artist.image),
        }
      : album.artist,
  };
};

/**
 * Ensures all URLs in an artist object use HTTPS
 */
export const ensureHttpsForArtistUrls = (artist: any): any => {
  if (!artist) return artist;

  return {
    ...artist,
    url: convertToHttps(artist.url),
    image: ensureHttpsForImages(artist.image),
    albums: Array.isArray(artist.albums)
      ? artist.albums.map((album: any) => ensureHttpsForAlbumUrls(album))
      : artist.albums,
    similar_artists: Array.isArray(artist.similar_artists)
      ? artist.similar_artists.map((similarArtist: any) =>
          ensureHttpsForArtistUrls(similarArtist),
        )
      : artist.similar_artists,
  };
};

/**
 * Ensures all URLs in a playlist object use HTTPS
 */
export const ensureHttpsForPlaylistUrls = (playlist: any): any => {
  if (!playlist) return playlist;

  // Handle both array and single image formats
  const secureImage = Array.isArray(playlist.image)
    ? ensureHttpsForImages(playlist.image)
    : convertToHttps(playlist.image);

  return {
    ...playlist,
    url: convertToHttps(playlist.url),
    image: secureImage,
    artists: Array.isArray(playlist.artists)
      ? ensureHttpsForArtists(playlist.artists)
      : playlist.artists,
  };
};
