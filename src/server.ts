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
