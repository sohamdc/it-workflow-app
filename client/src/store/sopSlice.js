import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchSopList = createAsyncThunk('sop/fetchList', async () => {
  const res = await api.get('/sop');
  return res.data;
});

export const fetchSopDetail = createAsyncThunk('sop/fetchDetail', async (id) => {
  const res = await api.get(`/sop/${id}`);
  return res.data;
});

export const createSop = createAsyncThunk('sop/create', async (name) => {
  const res = await api.post('/sop', { name });
  return res.data;
});

export const addStage = createAsyncThunk('sop/addStage', async ({ sopId, name, clientVisible }) => {
  const res = await api.post(`/sop/${sopId}/stages`, { name, clientVisible });
  return res.data;
});

export const updateStage = createAsyncThunk('sop/updateStage', async ({ sopId, stageId, data }) => {
  const res = await api.patch(`/sop/${sopId}/stages/${stageId}`, data);
  return res.data;
});

export const deleteStage = createAsyncThunk('sop/deleteStage', async ({ sopId, stageId }) => {
  await api.delete(`/sop/${sopId}/stages/${stageId}`);
  return stageId;
});

export const reorderStages = createAsyncThunk('sop/reorder', async ({ sopId, orderedStageIds }) => {
  await api.patch(`/sop/${sopId}/stages/reorder`, { orderedStageIds });
  return orderedStageIds;
});

export const publishSop = createAsyncThunk('sop/publish', async (sopId) => {
  const res = await api.post(`/sop/${sopId}/publish`);
  return res.data;
});

const sopSlice = createSlice({
  name: 'sop',
  initialState: {
    list: [],
    current: null, // the SOP currently open in the editor, with its stages
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSopList.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(fetchSopDetail.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createSop.fulfilled, (state, action) => {
        state.list.unshift({ ...action.payload, stageCount: 0 });
      })
      .addCase(addStage.fulfilled, (state, action) => {
        if (state.current) state.current.stages.push(action.payload);
      })
      .addCase(updateStage.fulfilled, (state, action) => {
        if (state.current) {
          const idx = state.current.stages.findIndex((s) => s.id === action.payload.id);
          if (idx !== -1) state.current.stages[idx] = action.payload;
        }
      })
      .addCase(deleteStage.fulfilled, (state, action) => {
        if (state.current) {
          state.current.stages = state.current.stages.filter((s) => s.id !== action.payload);
        }
      })
      .addCase(publishSop.fulfilled, (state, action) => {
        if (state.current) state.current.status = action.payload.status;
        const idx = state.list.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload };
      });
  },
});

export default sopSlice.reducer;