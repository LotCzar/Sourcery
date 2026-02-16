export function createRequest(
  url: string,
  options?: RequestInit
): Request {
  return new Request(url, options);
}

export function createJsonRequest(
  url: string,
  body: unknown,
  method: string = "POST"
): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function parseResponse(response: Response) {
  const data = await response.json();
  return { status: response.status, data };
}
