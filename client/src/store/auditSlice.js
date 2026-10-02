import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchAuditLog = createAsyncThunk('audit/fetch', async (params) => {
  const res = await api.get('/audit', { params });
  return res.data; // { items, total, page }
});

const auditSlice = createSlice({
  name: 'audit',
  initialState: {
    items: [],
    total: 0,
    page: 1,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchAuditLog.fulfilled, (state, action) => {
      state.items = action.payload.items;
      state.total = action.payload.total;
      state.page = action.payload.page;
    });
  },
});

export default auditSlice.reducer;