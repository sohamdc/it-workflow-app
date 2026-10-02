import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { clearToast } from '../store/projectSlice';

function Toast({ toast }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => dispatch(clearToast()), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, padding: '12px 20px', borderRadius: 4,
      background: toast.type === 'error' ? '#d32f2f' : '#2e7d32', color: 'white',
    }}>
      {toast.message}
    </div>
  );
}

export default Toast;