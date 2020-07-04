import {
    createAsyncThunk,
    ActionReducerMapBuilder,
    AsyncThunk,
  } from "@reduxjs/toolkit";
  import { EntityService, ListParameters } from "./EntityService";
  
  export type CrudAction = "create" | "update" | "delete" | "list" | "get";
  
  export const createCrudThunk = <T, P = void>(params: {
    operation: CrudAction;
    slice: string;
    entityName: string;
    serviceFunction: (thunkArg: P) => Promise<T>;
  }) =>
    createAsyncThunk(
      `${params.slice}/${params.operation}${params.entityName}`,
      async (actionPayload: P, { rejectWithValue }) => {
        try {
          return await params.serviceFunction(actionPayload);
        } catch (error) {
          return rejectWithValue(error);
        }
      }
    );
  
  export type CrudThunks<T, IDType> = {
    create: AsyncThunk<T, T, {}>;
    update: AsyncThunk<T, T, {}>;
    delete: AsyncThunk<T, T, {}>;
    list: AsyncThunk<T[], ListParameters, {}>;
    get: AsyncThunk<T, IDType, {}>;
  };
  export const createCrudThunks = <T, IDType>(params: {
    slice: string;
    entityName: string;
    entityService: EntityService<T, IDType>;
  }): CrudThunks<T, IDType> => {
    return {
      create: createCrudThunk({
        entityName: params.entityName,
        slice: params.slice,
        serviceFunction: params.entityService.create,
        operation: "create",
      }),
      update: createCrudThunk({
        entityName: params.entityName,
        slice: params.slice,
        serviceFunction: params.entityService.update,
        operation: "update",
      }),
      delete: createCrudThunk({
        entityName: params.entityName,
        slice: params.slice,
        serviceFunction: params.entityService.delete,
        operation: "delete",
      }),
      list: createCrudThunk({
        entityName: params.entityName,
        slice: params.slice,
        serviceFunction: params.entityService.list,
        operation: "list",
      }),
      get: createCrudThunk({
          entityName: params.entityName,
          slice: params.slice,
          serviceFunction: params.entityService.get,
          operation: "get"
      })
    };
  };
  
  const operationFulfilled: Record<keyof CrudThunks<any, any>, any> = {
    create: <T>(payload: T, state: EntityState<T>) => {
      state.entityList.push(payload);
    },
    update: <T extends { id: string }>(payload: T, state: EntityState<T>) => {
        const updatedArray = state.entityList.map((entity) =>
        entity.id === payload.id ? payload : entity
      )
      state.entityList.splice(0, state.entityList.length)
      state.entityList.push(...updatedArray);
    },
    list: <T>(payload: T[], state: EntityState<T>) => {
      state.entityList.splice(0, state.entityList.length);
      state.entityList.push(...payload)
    },
    delete: <T extends { id: string }>(payload: T, state: EntityState<T>) => {
      state.entityList.splice(state.entityList.findIndex((entity) => entity.id === payload.id));
    },
    get: <T>(payload: T, state: EntityState<T>) => {
        state.selectedEntity = payload;
    }
  };
  
  declare type NoInfer<T> = [T][T extends any ? 0 : never];
  export const registerCrudReducers = <State, T>(params: {
    builder: ActionReducerMapBuilder<NoInfer<State>>;
    crudThunks: CrudThunks<T, any>;
    getEntityState: (state: any) => EntityState<T>;
  }) =>{
    (Object.keys(params.crudThunks) as Array<
      keyof typeof params.crudThunks
    >).forEach((key) => {
      params.builder.addCase(params.crudThunks[key].pending, (state, action) => {
        const entityState = params.getEntityState(state);
        entityState.isLoading = true;
        entityState.error = "";
      });
      params.builder.addCase(
        params.crudThunks[key].fulfilled,
        (state, action) => {
          const entityState = params.getEntityState(state);
          entityState.isLoading = false;
          entityState.error = "";
          operationFulfilled[key](action.payload, entityState);
        }
      );
      params.builder.addCase(params.crudThunks[key].rejected, (state, action) => {
        const entityState = params.getEntityState(state);
        entityState.error = action.payload as string;
        entityState.isLoading = false;
      });
    });
  };
  
  export type EntityState<T> = {
    isLoading: boolean;
    error: string;
    entityList: T[];
    selectedEntity?: T;
  };
  