export function extractErrorMessage(data: any): string | null {
  if (!data) {
    return null;
  }
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data.detail === 'string') {
    return data.detail;
  }
  if (data.detail?.message) {
    return data.detail.message;
  }
  if (data.error?.message) {
    return data.error.message;
  }
  return null;
}

export function getErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}
