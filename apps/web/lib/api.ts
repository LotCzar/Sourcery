export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Inject active restaurant header for org admin restaurant switching
  if (typeof window !== "undefined") {
    const activeRestaurant = localStorage.getItem("freshsheet_active_restaurant");
    if (activeRestaurant) {
      headers["x-restaurant-id"] = activeRestaurant;
    }
  }

  const response = await fetch(url, {
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string>),
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error || "Request failed",
      response.status,
      data.details
    );
  }

  return data;
}
