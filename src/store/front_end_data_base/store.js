import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import candidateReducer from "../redux/candidate_reducer";
import examinerReducer from "../redux/examiner_reducer";
import adminReducer from "../redux/admin_reducer";

import cbtCandidateReducer from "../redux/cbt_candidate_reducer";
import cbtExaminerReducer from "../redux/cbt_examiner_reducer";
import cbtAdminReducer from "../redux/cbt_admin_reducer";

const rootReducer = combineReducers({
  candidateFunction: candidateReducer,
  examinerFunction: examinerReducer,
  adminFunction: adminReducer,
  cbtCandidateFunction: cbtCandidateReducer,
  cbtExaminerFunction: cbtExaminerReducer,
  cbtAdminFunction: cbtAdminReducer,
});

const persistConfig = { key: "root", storage };
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});
export const persistor = persistStore(store);
