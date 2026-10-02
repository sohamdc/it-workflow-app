import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import sopReducer from './sopSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sop: sopReducer,
  },
});