export type ListParameters = {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: string;
  search?: string;
};

export type EntityService<T, IDType> = {
  list: (listParameters: ListParameters) => Promise<T[]>;
  create: (entity: T) => Promise<T>;
  update: (entity: T) => Promise<T>;
  delete: (entity: T) => Promise<T>;
  get: (entityId: IDType) => Promise<T>;
  createChildService: <C>(
    parentId: string,
    childName: string
  ) => EntityService<C, IDType>;
};
