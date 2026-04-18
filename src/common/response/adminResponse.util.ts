export interface PaginationPayload {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function successResponse<T>(data: T, message = 'Success') {
  return {
    success: true,
    message,
    data,
  };
}

export function listResponse<T>(
  items: T[],
  pagination: PaginationPayload,
  message = 'Fetched successfully',
) {
  return {
    success: true,
    message,
    data: items,
    meta: {
      pagination,
    },
  };
}
