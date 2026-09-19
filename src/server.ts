import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { getHealth } from './modules/health/health.controller';
import { uploadImageHandler } from './modules/upload/upload.controller';
import authRoutes from './modules/auth/auth.routes';
import orgRoutes from './modules/organization/org.routes';
import employeeRoutes from './modules/employee/employee.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import leaveRoutes from './modules/leave/leave.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import projectRoutes from './modules/project/project.routes';
import taskRoutes from './modules/task/task.routes';
import progressRoutes from './modules/progress/progress.routes';
import goalRoutes from './modules/goal/goal.routes';
import reviewRoutes from './modules/review/review.routes';
import recruitmentRoutes from './modules/recruitment/recruitment.routes';
import communicationRoutes from './modules/communication/communication.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Core API Routes
app.get('/api/health', getHealth);
app.post('/api/upload/image', uploadImageHandler);
app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api', communicationRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'SparkX — HR & Company Management SaaS API',
    status: 'running',
    health: '/api/health',
    auth: '/api/auth',
    org: '/api/org',
    employees: '/api/employees',
    attendance: '/api/attendance',
    leave: '/api/leave',
    upload: '/api/upload/image'
  });
});

// Start Server immediately and connect to DB concurrently
app.listen(PORT, () => {
  console.log(`[SparkX Server] Running on port ${PORT}`);
  connectDB();
});

export default app;
