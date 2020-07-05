import { configureStore, createSlice, Slice, Store } from "@reduxjs/toolkit";
import thunk from "redux-thunk";
import {
  createCrudThunks,
  CrudThunks,
  EntityService,
  EntityState,
  ListParameters,
  registerCrudReducers,
} from "..";

interface User {
  id?: string;
  name: string;
}

// Constants

const MockUserService: EntityService<User, string> = {
  create: async (user: User) => ({ ...user, id: "1" } as User),
  delete: async (user: User) => user,
  get: async (userId: string) => ({ id: "1", name: "Sonikro" } as User),
  list: async (params: ListParameters) => [
    { id: "10", name: "Existing User" } as User,
  ],
  update: async (user: User) => user,
};
const initialState: EntityState<User> = {
  entityList: [],
  error: "",
  isLoading: false,
  selectedEntity: undefined,
};

// Tests

describe("createCrudThunks", () => {
  let userActions: CrudThunks<User, string>;
  let userSlice: Slice;
  let store: Store;

  beforeEach(() => {
    userActions = createCrudThunks({
      entityName: "user",
      slice: "user",
      entityService: MockUserService,
    });

    userSlice = createSlice({
      name: "user",
      initialState,
      reducers: {},
      extraReducers: (builder) => {
        registerCrudReducers({
          builder,
          crudThunks: userActions,
          getEntityState: (state) => state,
        });
      },
    });

    store = configureStore({
      reducer: {
        user: userSlice.reducer,
      },
      middleware: [thunk],
    });

    store.subscribe(() => console.log(JSON.stringify(store.getState())));
  });

  it("creates an object with all action creators", () => {
    expect(userActions.create).toBeTruthy();
    expect(userActions.delete).toBeTruthy();
    expect(userActions.get).toBeTruthy();
    expect(userActions.list).toBeTruthy();
    expect(userActions.update).toBeTruthy();
  });

  it("add user to state when create action is dispatched", () => {
    return store
      .dispatch(userActions.create({ name: "Sonikro" }) as any)
      .then(() => {
        expect(store.getState().user.entityList).toContainEqual({
          id: "1",
          name: "Sonikro",
        });
      });
  });

  it("list users when list action is dispatched", () => {
    return store.dispatch(userActions.list({}) as any).then(() => {
      expect(store.getState().user.entityList).toContainEqual({
        id: "10",
        name: "Existing User",
      });
    });
  });

  it("updates users when update action is dispatched", async () => {
    await store.dispatch(userActions.list({}) as any); //Populate array first
    return store
      .dispatch(userActions.update({ id: "10", name: "Updated User" }) as any)
      .then(() => {
        expect(store.getState().user.entityList).toContainEqual({
          id: "10",
          name: "Updated User",
        });
      });
  });

  it("deletes users when delete action is dispatched", async () => {
    await store.dispatch(userActions.list({}) as any); //Populate array first
    return store
      .dispatch(userActions.delete({ id: "10", name: "Existing User" }) as any)
      .then(() => {
        expect(store.getState().user.entityList).toHaveLength(0);
      });
  });

  it("get user when get action is dispatched", async () => {
    return store.dispatch(userActions.get("10") as any).then(() => {
      expect(store.getState().user.selectedEntity).toMatchObject({
        id: "1",
        name: "Sonikro",
      });
    });
  });
});
