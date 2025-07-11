import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import morgan from 'morgan';
import prisma from "./configs/prisma";
import {authRouter} from "./routes/auth.routes";
import cookieParser from "cookie-parser"
import responseHandler from "./middlewares/response.middleware";
import {userRoutes} from "./routes/user.routes";
import {chatRouter} from "./routes/chat.routes";
import { messageRouter } from './routes/message.routes';
import { setupSockets } from './sockets';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
};

const server = http.createServer(app);
export const io = new Server(server, { cors: corsOptions });


setupSockets(io)

app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(cookieParser())
app.use((req: Request, res: Response, next: NextFunction) => responseHandler(req, res, next));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (NODE_ENV === 'development') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
  });
});

app.get('/api/status', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      message: 'API is running',
      version: '1.0.0',
      environment: NODE_ENV,
      database: 'connected',
    });
  } catch (error) {
    res.status(500).json({
      message: 'API is running, but DB connection failed',
      environment: NODE_ENV,
      database: 'disconnected',
      error: (error as Error).message,
    });
  }
});

app.use('/api/auth', authRouter)
app.use("/api/users", userRoutes)
app.use("/api/chats", chatRouter)
app.use("/api/message", messageRouter)
const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('Server closed.');
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => {
    console.log('Force shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`📊 Health check available at http://0.0.0.0:${PORT}/health`);
});

export default app;
