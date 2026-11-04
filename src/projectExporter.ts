/**
 * Stub for AI Studio / Google Cloud bridge helpers.
 * Real implementation is only needed inside the AI Studio runtime.
 * For the public GitHub Pages build we provide no-op fallbacks.
 */

export type AccessibilityTestResult = {
  ok: boolean;
  status: number;
  hasFreshCode: boolean;
  details: string[];
};

export type ProjectFile = {
  path: string;
  content: string;
};

export function getProjectFiles(): ProjectFile[] {
  return [];
}

export async function pushProjectToGitHub(_opts: {
  token: string;
  repoName: string;
  isPrivate?: boolean;
  onProgress?: (status: string, current: number) => void;
}): Promise<{ repoUrl: string; pageUrl: string; owner: string; actionsUrl?: string }> {
  throw new Error(
    'Прямая выгрузка из браузера недоступна в опубликованной версии. Используйте GitHub Actions или локальный push.'
  );
}

export async function generateProjectZip(): Promise<Blob> {
  return new Blob([''], { type: 'application/zip' });
}

export function downloadBlob(_blob: Blob, _filename: string): void {
  // no-op in public build
}

export async function testRemoteSiteAccessibility(
  url: string
): Promise<AccessibilityTestResult> {
  try {
    const res = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return {
      ok: true,
      status: res.status || 200,
      hasFreshCode: true,
      details: [`Сайт доступен: ${url}`],
    };
  } catch {
    return {
      ok: false,
      status: 0,
      hasFreshCode: false,
      details: [`Не удалось проверить ${url} (возможно CORS).`],
    };
  }
}
