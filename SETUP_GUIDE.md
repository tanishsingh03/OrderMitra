# 🚀 Quick Setup Guide

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create `.env` File
Copy the example and fill in your values:
```bash
# Copy from .env.example or create manually
DATABASE_URL=postgresql://ordermitra:ordermitra123@localhost:5432/ordermitra
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=6789
FRONTEND_URL=http://localhost:6789
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. Start Docker Services
```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)

### 4. Setup Database
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed admin user
npm run prisma:seed
```

### 5. Start Server
```bash
npm start
# or for development
npm run dev
```

### 6. Access Application
- Frontend: http://localhost:6789
- API: http://localhost:6789/api
- Prisma Studio: `npx prisma studio`

## Default Admin Login
- Email: `admin@ordermitra.com`
- Password: `admin123`

## Testing Features

### 1. Customer Signup/Login
- Go to http://localhost:6789/signup.html
- Sign up as customer
- Login and explore dashboard

### 2. Restaurant Signup/Login
- Sign up as restaurant-owner
- Login to restaurant dashboard
- Add menu items

### 3. Forgot Password
- Go to http://localhost:6789/forgot-password.html
- Enter email
- Check email for reset link (if email configured)

### 4. Delivery Partner
- Use API: `POST /api/delivery/signup`
- Or create via Prisma Studio

### 5. Admin Dashboard
- Login as admin
- Access: `GET /api/admin/dashboard/stats`

## Troubleshooting

### Database Connection Error
- Check if PostgreSQL is running: `docker-compose ps`
- Verify DATABASE_URL in `.env`

### Redis Connection Error
- Check if Redis is running: `docker-compose ps`
- Verify REDIS_HOST and REDIS_PORT

### Email Not Working
- Email service is optional
- Configure EMAIL_USER and EMAIL_PASS for password reset
- Without email, password reset will log to console

### Port Already in Use
- Change PORT in `.env`
- Or stop the service using port 6789

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Rebuild containers
docker-compose up -d --build

# View database
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name
```

## Next Steps

1. ✅ Test all features
2. ✅ Configure email service
3. ✅ Add payment gateway (optional)
4. ✅ Customize frontend
5. ✅ Deploy to production

---

**Happy Coding! 🎉**

