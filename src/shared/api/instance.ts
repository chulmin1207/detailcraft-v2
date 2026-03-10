// ===== TIMEOUT FETCH =====
// 타임아웃이 적용된 fetch 래퍼 함수
export function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeout: number = 60000,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`타임아웃: ${timeout / 1000}초 초과. 다시 시도해주세요.`));
    }, timeout);

    fetch(url, options)
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error: Error) => {
        clearTimeout(timeoutId);
        console.error('Fetch error details:', error);
        if (error.message.includes('Failed to fetch')) {
          reject(new Error('CORS/네트워크 오류: 페이지를 새로고침하고 다시 시도해주세요.'));
        } else {
          reject(new Error(`네트워크 오류: ${error.message}`));
        }
      });
  });
}
