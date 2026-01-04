require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { initScheduledTasks } = require('./utils/scheduler');

// 🔥 controller של auth (אם צריך אותו ישירות)
const authController = require('./controllers/auth.controller');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const projectRoutes = require('./routes/project.routes');
// const employeeRoutes = require('./routes/employee.routes');
const logRoutes = require('./routes/log.routes');
const uploadRoutes = require('./routes/upload.routes');
const notificationRoutes = require('./routes/notification.routes');

// Create Express app
const app = express();

// ------------------ MIDDLEWARE ------------------

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ------------------ STATIC FILES (OLD LOCAL UPLOADS) ------------------

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      if (filePath && filePath.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Content-Type', 'application/pdf');
      }
    },
  })
);

// ------------------ API ROUTES ------------------

// ✅ תומך גם ב-/api/auth וגם ב-/auth
app.use(['/api/auth', '/auth'], authRoutes);

// Users
app.use(['/api/users', '/users'], userRoutes);

// Projects
app.use(['/api/projects', '/projects'], projectRoutes);

// Logs
app.use(['/api/logs', '/logs'], logRoutes);

app.use(['/api/uploads', '/uploads', '/uploads-api'], uploadRoutes);
// Notifications
app.use(['/api/notifications', '/notifications'], notificationRoutes);

// אם יש Employees בעתיד:
// app.use(['/api/employees', '/employees'], employeeRoutes);

// ------------------ ROOT ROUTE ------------------

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Daily Work Log System API' });
});

// ------------------ 404 HANDLER ------------------

app.use((req, res, next) => {
  console.warn(`❌ Route not found: [${req.method}] ${req.originalUrl}`);
  res.status(404).json({
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
  });
});

// ------------------ ERROR HANDLER 500 ------------------

app.use((err, req, res, next) => {
  console.error('🔥 Server error:', err.stack);
  res.status(500).json({
    message: err.message || 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});
// ------------------ DB & SERVER ------------------

const PORT = Number(process.env.PORT) || 8080;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
}

// ✅ קודם כל מרימים שרת כדי ש-Cloud Run יעבור health check
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// ✅ ואז מתחברים ל-MongoDB (לא חוסם את עליית השירות)
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ Connected to MongoDB');
    initScheduledTasks();
    console.log('⏰ Scheduled tasks initialized');
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB', err.message || err);
    // לא עושים process.exit ב-Cloud Run, כדי לא להפיל את הקונטיינר
  });

module.exports = app;
