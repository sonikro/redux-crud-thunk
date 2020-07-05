# react-crud-thunk 
![Node.js Package](https://github.com/sonikro/redux-crud-thunk/workflows/Node.js%20Package/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=redux-crud-thunk&metric=alert_status)](https://sonarcloud.io/dashboard?id=redux-crud-thunk)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=redux-crud-thunk&metric=bugs)](https://sonarcloud.io/dashboard?id=redux-crud-thunk)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=redux-crud-thunk&metric=coverage)](https://sonarcloud.io/dashboard?id=redux-crud-thunk)

This is a library with helper functions for dealing with standard CRUD Operations on REST Based apis.

## The Problem

REST APIs usually have an endpoint for each entity, and each entity end up looking with something like this: 

| VERB | PATH                    | USE |
|------|------|-----|
| GET  |  /entity?searchParameters     | Return a list of entity, based on search parameters   |
| GET     | /entity/:id     |  Return a single entity, based on an ID   | 
| POST     | /entity     |  Creates a new entity, and returns the created entity body    | 
| PUT | /entity/:id | Updates a given entity, and returns the updated entity |
| DELETE | /entity/:id | Deletes a given entity, and returns the deleted entity |

So, for each of these services, we would have to implement a different Thunk Action, and handle Loading, Error and Success states.

This can lead to duplicated code, and several unnecessary lines of code to achieve the same behaviour over and over again...

## The Solution

This library implements an opinionated way of creating thunk actions for all of your entities. This way, you don't have to worry about creating list, get, create, update and delete actions for every one of your entities.

## Prerequisites
You need to have @reduxjs/toolkit installed in your project, if you don't have it yet, install it using the following command:
```bash
npm install @reduxjs/toolkit
```

The API you're consuming, must also match with the structure defined earlier

## Usage

First, install the library to your project
```bash
npm i react-crud-thunk
```

### Preparing your EntityService

You can create a helper function in your project, to help you create EntityServices easily. This is an example of an implementation.

```typescript
import { EntityService, ListParameters } from "redux-crud-thunk";

const createCrudFunctions = <T extends { id?: string }>(
  resourcePath: string
) => ({
  list: (listParam: ListParameters) =>
    API.call({ resourcePath: `/${resourcePath}`, method: "GET" }),
  create: (body: T) =>
    API.call({
      resourcePath: `/${resourcePath}`,
      method: "POST",
      body,
    }),
  update: (body: T) =>
    API.call({
      resourcePath: `/${resourcePath}/${body.id!}`,
      method: "PUT",
      body,
    }),
  delete: async (body: T) =>
    API.call({
      resourcePath: `/${resourcePath}/${body.id!}`,
      method: "DELETE",
    }),
});

export const createEntityService = <T extends { id?: string }>(
  entityName: string
): EntityService<T> => {
  const parentPath = `/${entityName}`;
  return {
    ...createCrudFunctions(parentPath),
    createChildService: (parentId: string, childName: string) =>
      createEntityService(`${parentPath}/${parentId}/${childName}`),
  };
};
```

Then, with the help of these helper functions, it's easy to create EntityServices for each of your entities. In this example, I have an entity called *User*, and a child entity called *Skill*, meaning that each User can have multiple skills.

```typescript
import { User } from "../domain/User";
import { createEntityService } from "./EntityService";
import { Skill } from "../domain/Skill";

export const UserService = createEntityService<User>("user")
export const SkillService = (userId: string) => UserService.createChildService<Skill>(userId, "skill")
```

Don't worry, you can implement any way you want, as long as it follows the specs for the EntityService<T> type, provided by this package.

Now that you have your EntityServices implemented, meaning that they already know how to invoke the corresponding API, all you have to do, is prepare your state slice.

### Preparing your slice

So let's say you have an User entity, and you're creating a User slice in your State. All you have to do, is create a property of type *EntityState<User>*. This will automatically define all the standard properties to handle state for this entity, such as :
- isLoading
- error
- entityList
- selectedEntity

In your slice, define a state property like this:
```typescript
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "../../domain/User";
import {
  createCrudThunks, EntityState, registerCrudReducers
} from "redux-crud-thunk";
import { UserService } from "../UserService";

export interface UserSlice {
  userState: EntityState<User>;
}

const initialState: UserSlice = {
  userState: {
    entityList: [],
    error: "",
    isLoading: false,
    selectedEntity: undefined,
  },
};

```

Now, in order to create all the necessary Thunk Actions, let's use the helper function *createCrudThunks*

```typescript
export const userActions = createCrudThunks<User>({
  entityName: "user",
  slice: "user",
  entityService: UserService,
});
```

Now, the last step, is to register all the extra reducers generated by the createCrudThunks helper function

```typescript
const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    selectUser: (state, action: PayloadAction<User>) => {
      state.userState.selectedEntity = action.payload;
    },
  },
  extraReducers: (builder) => {
    registerCrudReducers({
      builder,
      crudThunks: userActions,
      getEntityState: (state) => state.userState,
    });
  },
});

export const userSelector = (state: { user: UserSlice }) => state.user.userState;
export const { selectUser } = userSlice.actions;
export default userSlice.reducer;
```

The complete User Slice will look something like this:
```typescript
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "../../domain/User";
import {
  createCrudThunks, EntityState, registerCrudReducers
} from "redux-crud-thunk";
import { UserService } from "../UserService";
export interface UserSlice {
  userState: EntityState<User>;
}

const initialState: UserSlice = {
  userState: {
    entityList: [],
    error: "",
    isLoading: false,
    selectedEntity: undefined,
  },
};

export const userActions = createCrudThunks<User>({
  entityName: "user",
  slice: "user",
  entityService: UserService,
});

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    selectUser: (state, action: PayloadAction<User>) => {
      state.userState.selectedEntity = action.payload;
    },
  },
  extraReducers: (builder) => {
    registerCrudReducers({
      builder,
      crudThunks: userActions,
      getEntityState: (state) => state.userState,
    });
  },
});

export const userSelector = (state: { user: UserSlice }) => state.user.userState;
export const { selectUser } = userSlice.actions;
export default userSlice.reducer;
```

That's it, all CREATE, UPDATE, DELETE, GET and LIST actions were created, and all PENDING/FULFILLED/REJECTED reducers were registered to your slice. All you have to do now, is to dispatch your actions, based on your components needs.

### Dispatching your CRUD Actions

The *createCrudThunks* function returns an object with action creators for all crud operations. So, all you have to do, is dispatch the actions like this:

```typescript
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { userSelector, selectUser, userActions } from "../../service/user/slice";
import { User } from "../../domain/User";

export const UserTable: React.FC = () => {
  const dispatch = useDispatch();

  React.useEffect(() => {
    dispatch(userActions.list({}));
  }, [dispatch]);

  const userState = useSelector(userSelector);

  const selectRow = (row: User) => (event: any) => {
    dispatch(selectUser(row))
  }
  return (
   ...
  );
};

```

# Contributing

Pull requests are welcome, feel free to contribute to this project.