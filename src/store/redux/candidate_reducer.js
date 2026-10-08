import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  role: "candidate",
  accessType: "CANDIDATE_ACCESS",
  activeCandidate: {},
  sessionToken: null,
};

const candidateSlice = createSlice({
  name: "candidateFunction",
  initialState,
  reducers: {
    startCandidateAction(state, action) {
      state.isAuthenticated = true;
      state.activeCandidate = action.payload?.activeCandidate || action.payload?.candidateData || {};
      state.sessionToken = action.payload?.sessionToken || null;
    },
    logOutCandidate(state) {
      Object.assign(state, initialState);
    },
  },
});

export const { startCandidateAction, logOutCandidate } = candidateSlice.actions;
export default candidateSlice.reducer;
