import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import candidateReducer from "../redux/candidate_reducer";
import examinerReducer from "../redux/examiner_reducer";
import adminReducer from "../redux/admin_reducer";

const rootReducer = combineReducers({
  candidateFunction: candidateReducer,
  examinerFunction: examinerReducer,
  adminFunction: adminReducer,
});

const persistConfig = { key: "root", storage };
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});
export const persistor = persistStore(store);
