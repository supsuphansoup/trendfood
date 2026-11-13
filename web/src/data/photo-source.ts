import type { PhotoCredit, PhotoProvider } from "./photo-credits.ts";

export function trustedPhotoUrl(value: string, source = false, provider: PhotoProvider = "commons"): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (provider === "commons") return source
      ? url.hostname === "commons.wikimedia.org" && url.pathname.startsWith("/wiki/File:")
      : ["upload.wikimedia.org", "thumb.wikimedia.org"].includes(url.hostname) && url.pathname.startsWith("/wikipedia/commons/");
    if (provider === "openverse") return source
      ? url.hostname === "www.flickr.com" && /^\/photos\/[^/]+\/\d+\/?$/.test(url.pathname)
      : /^(?:live|farm\d+)\.staticflickr\.com$/.test(url.hostname) && /^\/\d+\/\d+_[a-z0-9_]+\.(?:jpe?g|png|webp)$/i.test(url.pathname);
    if (provider === "pexels") return source
      ? url.hostname === "www.pexels.com" && /^\/photo\/(?:[a-z0-9-]+-)?[1-9]\d*\/?$/i.test(url.pathname)
      : url.hostname === "images.pexels.com" && /^\/photos\/\d+\/[^/]+\.(?:jpe?g|png|webp)$/i.test(url.pathname);
    return false;
  } catch { return false; }
}

/** 출처별 주소와 이용 조건을 함께 검사한다. 모델 응답으로 허용 범위를 늘리지 않는다. */
export function validPhotoSource(photo: PhotoCredit): boolean {
  const provider = photo.provider ?? "commons";
  if (!trustedPhotoUrl(photo.url, true, provider) || !trustedPhotoUrl(photo.imageUrl, false, provider)) return false;
  if (photo.creatorUrl) {
    try {
      const creator = new URL(photo.creatorUrl);
      if (creator.protocol !== "https:" || creator.username || creator.password || creator.port) return false;
      if (provider === "pexels" && (creator.hostname !== "www.pexels.com" || !/^\/@[^/]+\/?$/.test(creator.pathname))) return false;
      if (provider === "openverse" && (creator.hostname !== "www.flickr.com" || !/^\/photos\/[^/]+\/?$/.test(creator.pathname))) return false;
    } catch { return false; }
  } else if (provider === "pexels") return false;
  if (provider === "pexels") {
    const id = photo.providerId;
    return !!id && /^[1-9]\d*$/.test(id) && photo.license === "Pexels License" && photo.licenseUrl === "https://www.pexels.com/license/"
      && new RegExp(`(?:-|/)${id}/?$`).test(new URL(photo.url).pathname) && new URL(photo.imageUrl).pathname.startsWith(`/photos/${id}/`);
  }
  const licenseUrls: Record<string, RegExp> = {
    "CC0": /^https:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/?$/,
    "Public domain": /^https:\/\/(?:creativecommons\.org\/publicdomain\/mark\/1\.0\/?|commons\.wikimedia\.org\/wiki\/Help:Public_domain)$/,
    "CC BY 4.0": /^https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/?$/,
    "CC BY-SA 4.0": /^https:\/\/creativecommons\.org\/licenses\/by-sa\/4\.0\/?$/,
  };
  if (!licenseUrls[photo.license]) return false;
  if (provider === "commons") return !photo.licenseUrl || licenseUrls[photo.license].test(photo.licenseUrl);
  if (!photo.providerId || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(photo.providerId) || !licenseUrls[photo.license].test(photo.licenseUrl ?? "")) return false;
  const id = new URL(photo.url).pathname.match(/\/(\d+)\/?$/)?.[1];
  return !!id && new URL(photo.imageUrl).pathname.split("/")[2].startsWith(`${id}_`);
}
