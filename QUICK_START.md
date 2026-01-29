# 🚀 Quick Start - Run Project Now

## Step 1: Free Port 6789
```bash
# Kill the process using port 6789
lsof -ti:6789 | xargs kill -9
```

## Step 2: Start Server
```bash
npm start
```

## OR Use the Automated Script
```bash
./start-server.sh
```

## Expected Output
You should see:
```
🚀 Server running with WebSockets on port 6789
✅ Redis Publisher Connected
✅ Redis Subscriber Connected
```

## Access the Application
- **Frontend**: http://localhost:6789
- **API**: http://localhost:6789/api

## If Port Still in Use

### Check Docker Container
```bash
docker-compose ps
docker-compose stop app
```

### Or Use Different Port
1. Update `.env`:
   ```env
   PORT=6790
   ```
2. Restart server

---

**Quick Command**: `lsof -ti:6789 | xargs kill -9 && npm start`

