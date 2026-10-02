import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchProjects = createAsyncThunk('projects/fetchAll', async () => {
  const res = await api.get('/projects');
  return res.data;
});

export const fetchProjectDetail = createAsyncThunk('projects/fetchOne', async (id) => {
  const res = await api.get(`/projects/${id}`);
  return res.data;
});

export const createProject = createAsyncThunk('projects/create', async (data) => {
  const res = await api.post('/projects', data);
  return res.data;
});

export const assignStage = createAsyncThunk('projects/assignStage', async ({ projectId, stageId, assigneeId }) => {
  const res = await api.patch(`/projects/${projectId}/stages/${stageId}/assign`, { assigneeId });
  return res.data;
});

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    list: [],
    current: null,
    status: 'idle',
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(fetchProjectDetail.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(assignStage.fulfilled, (state, action) => {
        if (state.current) {
          const idx = state.current.stages.findIndex((s) => s.id === action.payload.id);
          if (idx !== -1) state.current.stages[idx] = action.payload;
        }
      });
  },
});

export default projectSlice.reducer;