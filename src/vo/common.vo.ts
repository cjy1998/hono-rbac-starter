export interface PaginatedVO<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
