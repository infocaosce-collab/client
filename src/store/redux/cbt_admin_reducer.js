import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  role: "admin",
  accessType: "ADMIN_ACCESS",
  activeAdmin: {},
  sessionToken: null,
};

const adminSlice = createSlice({
  name: "cbtAdminFunction",
  initialState,
  reducers: {
    startAdminAction(state, action) {
      state.isAuthenticated = true;
      state.activeAdmin = action.payload?.activeAdmin || action.payload?.adminData || {};
      state.sessionToken = action.payload?.sessionToken || null;
    },
    logOutAdmin(state) {
      Object.assign(state, initialState);
    },
  },
});

export const { startAdminAction, logOutAdmin } = adminSlice.actions;
export default adminSlice.reducer;
