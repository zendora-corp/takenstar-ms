export async function fetcher<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = res.statusText || errorMessage;
    }

    const error: any = new Error(errorMessage);
    error.status = res.status;
    throw error;
  }

  return res.json();
}
