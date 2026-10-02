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

// thunkAPI.rejectWithValue lets us pass back BOTH the error and which stage
// failed, plus the stage's state before we optimistically changed it —
// so the component can roll back precisely.
export const updateStageStatus = createAsyncThunk(
  'projects/updateStatus',
  async ({ projectId, stageId, data }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/projects/${projectId}/stages/${stageId}/status`, data);
      return res.data;
    } catch (err) {
      return rejectWithValue({ message: err.response?.data?.message || 'Update failed', stageId });
    }
  }
);

export const fetchStatusHistory = createAsyncThunk(
  'projects/fetchHistory',
  async ({ projectId, stageId }) => {
    const res = await api.get(`/projects/${projectId}/stages/${stageId}/status-history`);
    return { stageId, history: res.data };
  }
);

export const addRemark = createAsyncThunk(
  'projects/addRemark',
  async ({ projectId, stageId, text }) => {
    const res = await api.post(`/projects/${projectId}/stages/${stageId}/remarks`, { text });
    return { stageId, remark: res.data };
  }
);

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    list: [],
    current: null,
    history: {}, // { [stageId]: [...rows] }
    toast: null, // { type: 'error'|'success', message: string }
  },
  reducers: {
    // Applied the instant the user clicks Save — before the API call finishes.
    // Makes the UI feel instant; we roll this back if the server rejects it.
    optimisticStatusUpdate(state, action) {
      const { stageId, data } = action.payload;
      const stage = state.current?.stages.find((s) => s.id === stageId);
      if (stage) Object.assign(stage, data);
    },
    rollbackStage(state, action) {
      const { stageId, previousStage } = action.payload;
      const idx = state.current?.stages.findIndex((s) => s.id === stageId);
      if (idx !== -1 && state.current) state.current.stages[idx] = previousStage;
    },
    clearToast(state) {
      state.toast = null;
    },
  },
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
      })
      .addCase(updateStageStatus.fulfilled, (state, action) => {
        // Confirms the optimistic update with the server's real saved version.
        if (state.current) {
          const idx = state.current.stages.findIndex((s) => s.id === action.payload.id);
          if (idx !== -1) state.current.stages[idx] = action.payload;
        }
        state.toast = { type: 'success', message: 'Status updated' };
      })
      .addCase(updateStageStatus.rejected, (state, action) => {
        state.toast = { type: 'error', message: action.payload?.message || 'Update failed — rolled back' };
      })
      .addCase(fetchStatusHistory.fulfilled, (state, action) => {
        state.history[action.payload.stageId] = action.payload.history;
      })
      .addCase(addRemark.fulfilled, (state, action) => {
        const stage = state.current?.stages.find((s) => s.id === action.payload.stageId);
        if (stage) {
          if (!stage.remarks) stage.remarks = [];
          stage.remarks.push(action.payload.remark);
        }
      });
  },
});

export const { optimisticStatusUpdate, rollbackStage, clearToast } = projectSlice.actions;
export default projectSlice.reducer;