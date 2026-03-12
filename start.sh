#!/bin/bash
# CRM Platform - Development Startup Script

echo ""
echo "🚀 Starting AI-Integrated CRM Platform..."
echo ""

# Check if .env exists
if [ ! -f "backend/.env" ]; then
  echo "⚠️  backend/.env not found. Copying from .env.example..."
  cp backend/.env.example backend/.env
fi

# Start backend in background
echo "📡 Starting Backend API on port 5000..."
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🖥️  Starting Frontend on port 3000..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ CRM Platform is running!"
echo ""
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:5000"
echo "   API Docs:  http://localhost:5000/health"
echo ""
echo "   Admin Login:"
echo "   Email:     admin@example.com"
echo "   Password:  Admin@123456"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'; exit 0" INT TERM
wait
