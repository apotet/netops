/** Reviewed shared resources; update this revision explicitly for staging only. */
export const SHARED_ASSETS_REVISION = '1c52fa81222167dc4377fe4788de86f3e36ad444';
const REPOSITORY = 'apotet/osi-tcpip-exam-public';
export const SHARED_ASSETS_BASE_URL =
  `https://raw.githubusercontent.com/${REPOSITORY}/${SHARED_ASSETS_REVISION}`;

export function sharedAssetUrl(relativePath: string): string {
  return `${SHARED_ASSETS_BASE_URL}/${relativePath.replace(/^\.?\//, '')}`;
}

export const SHARED_ASSETS_CREDITS_URL = sharedAssetUrl('assets/photos/credits.json');
export const SHARED_ASSETS_CREDITS_SOURCE_URL =
  `https://github.com/${REPOSITORY}/blob/${SHARED_ASSETS_REVISION}/assets/photos/credits.json`;
export const SHARED_ASSETS_OG_IMAGE_URL = sharedAssetUrl('assets/cheatsheets/l3.webp');
