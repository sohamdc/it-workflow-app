import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchUsers = createAsyncThunk('users/fetchAll', async () => {
  const res = await api.get('/users');
  return res.data;
});

export const fetchRoles = createAsyncThunk('users/fetchRoles', async () => {
  const res = await api.get('/roles');
  return res.data;
});

export const createUser = createAsyncThunk('users/create', async (data) => {
  const res = await api.post('/users', data);
  return res.data;
});

export const deactivateUser = createAsyncThunk(
  'users/deactivate',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/users/${id}/deactivate`);
      return { id, ...res.data };
    } catch (err) {
      if (err.response?.status === 409) {
        // Not a real error for our purposes — the UI needs this data to show the reassign modal.
        return rejectWithValue({ status: 409, ...err.response.data, userId: id });
      }
      throw err;
    }
  }
);

export const reassignUser = createAsyncThunk('users/reassign', async ({ fromUserId, toUserId }) => {
  const res = await api.post(`/users/${fromUserId}/reassign`, { toUserId });
  return res.data;
});

const userSlice = createSlice({
  name: 'users',
  initialState: {
    list: [],
    roles: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.roles = action.payload;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(deactivateUser.fulfilled, (state, action) => {
        const user = state.list.find((u) => u.id === action.payload.id);
        if (user) user.isActive = false;
      });
  },
});

export default userSlice.reducer;