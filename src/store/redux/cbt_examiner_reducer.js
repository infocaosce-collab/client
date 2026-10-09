import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  role: "examiner",
  accessType: "EXAMINER_ACCESS",
  activeExaminer: {},
  sessionToken: null,
};

const examinerSlice = createSlice({
  name: "cbtExaminerFunction",
  initialState,
  reducers: {
    startExaminerAction(state, action) {
      state.isAuthenticated = true;
      state.activeExaminer = action.payload?.activeExaminer || action.payload?.examinerData || {};
      state.sessionToken = action.payload?.sessionToken || null;
    },
    logOutExaminer(state) {
      Object.assign(state, initialState);
    },
  },
});

export const { startExaminerAction, logOutExaminer } = examinerSlice.actions;
export default examinerSlice.reducer;
