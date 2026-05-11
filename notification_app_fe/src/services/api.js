import axios from 'axios';

const studentId = import.meta.env.VITE_STUDENT_ID || '1042';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
    'x-student-id': studentId,
  },
});

export { studentId };
