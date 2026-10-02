import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import sopReducer from './sopSlice';
import userReducer from './userSlice';
import projectReducer from './projectSlice';
import auditReducer from './auditSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sop: sopReducer,
    users: userReducer,
    projects: projectReducer,
    audit: auditReducer,
  },
});