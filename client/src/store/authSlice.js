
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      return res.data; // { accessToken, user }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

// Called once when the app first loads, to restore a session using the
// httpOnly refresh cookie (if the browser still has one from before).
export const restoreSession = createAsyncThunk(
  'auth/restore',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/refresh');
      return res.data;
    } catch (err) {
      return rejectWithValue('No session');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    sessionChecked: false, // becomes true once restoreSession has run once, so we know whether to show the login page or a loading spinner
  },
  reducers: {
    // Used directly by the axios interceptor after a silent refresh — no thunk needed there.
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.sessionChecked = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.sessionChecked = true; // no session — fine, just means "show login page"
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
      });
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;