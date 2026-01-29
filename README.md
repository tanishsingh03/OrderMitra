# 🍔 OrderMitra - Complete Food Delivery Platform

A **production-ready, portfolio-worthy** food delivery platform with real-time order tracking, built with Node.js, Express, Prisma, PostgreSQL, Redis, WebSockets, and Docker.

## ✨ Features

### 👤 Customer Features
- ✅ User signup/login with JWT authentication
- ✅ Profile management with multiple addresses
- ✅ Browse restaurants (by distance, rating, cuisine)
- ✅ Search & filter restaurants
- ✅ Menu browsing with add-ons
- ✅ Shopping cart & checkout
- ✅ **Live order tracking** (WebSocket-powered)
- ✅ Order history
- ✅ **Ratings & reviews**
- ✅ **Push / in-app notifications**
- ✅ **Multiple payment modes** (UPI / cards / COD / Wallet)
- ✅ **Wallet system** for quick payments
- ✅ **Coupon/discount codes**
- ✅ **Forget password** with email reset
- ✅ **Order scheduling** (coming soon)

### 🍽️ Restaurant Features
- ✅ Restaurant onboarding & verification
- ✅ Menu & category management
- ✅ Item availability toggle
- ✅ Order accept/reject
- ✅ Prep time estimation
- ✅ **Real-time order status updates**
- ✅ Sales analytics
- ✅ **Offers & discounts**
- ✅ Restaurant wallet & settlements
- ✅ **Commission tracking**

### 🚴 Delivery Partner Features
- ✅ Partner onboarding & KYC
- ✅ Availability toggle (online/offline)
- ✅ Auto/manual order acceptance
- ✅ **Live GPS location sharing**
- ✅ Earnings dashboard
- ✅ Wallet & payouts
- ✅ Delivery history
- ✅ Real-time order updates

### 🧑‍💼 Admin Features
- ✅ Live order monitoring dashboard
- ✅ User, restaurant & partner management
- ✅ Commission configuration
- ✅ Coupon management
- ✅ Refund & dispute handling
- ✅ Platform analytics
- ✅ Manual order reassignment
- ✅ System settings

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.io with Redis pub/sub
- **Caching**: Redis
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer (for password reset & notifications)
- **File Upload**: Multer
- **Containerization**: Docker & Docker Compose
- **Frontend**: Vanilla JavaScript, HTML, CSS (Modern & Responsive)

## 📋 Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- npm or yarn
- PostgreSQL (or use Docker)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "OrderMitra copy"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://ordermitra:ordermitra123@localhost:5432/ordermitra

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server
PORT=6789
NODE_ENV=development
FRONTEND_URL=http://localhost:6789

# Email Configuration (for password reset and notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Note**: For Gmail, you need to generate an [App Password](https://support.google.com/accounts/answer/185833).

### 4. Start Services with Docker

```bash
# Start PostgreSQL and Redis
docker-compose up -d
```

This will start:
- PostgreSQL on port `5432`
- Redis on port `6379`
- Node.js app on port `6789`

### 5. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (creates admin user)
npm run prisma:seed
```

**Default Admin Credentials:**
- Email: `admin@ordermitra.com`
- Password: `admin123`

### 6. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:6789`

## 📁 Project Structure

```
OrderMitra/
├── Controller/              # Route controllers
│   ├── auth.controller.js
│   ├── admin.controller.js
│   ├── delivery.controller.js
│   ├── address.controller.js
│   ├── wallet.controller.js
│   ├── rating.controller.js
│   ├── coupon.controller.js
│   └── notification.controller.js
├── Middleware/             # Authentication, file upload
│   ├── auth.middleware.js
│   └── upload.js
├── Routes/                 # API routes
│   ├── auth.routes.js
│   ├── admin.routes.js
│   ├── delivery.routes.js
│   ├── address.routes.js
│   ├── wallet.routes.js
│   ├── rating.routes.js
│   ├── coupon.routes.js
│   └── notification.routes.js
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
├── public/                 # Frontend files (HTML, CSS, JS)
│   ├── *.html
│   ├── *.js
│   ├── *.css
│   ├── forgot-password.html
│   └── reset-password.html
├── Utility/                # Helper services
│   ├── prisma.js
│   ├── redis.js
│   ├── email.service.js
│   └── notification.service.js
├── uploads/                # Uploaded images
├── server.js              # Main server file
├── websocket.js           # WebSocket setup
├── docker-compose.yml     # Docker configuration
├── Dockerfile             # Docker image for app
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/signup` - User/Restaurant signup
- `POST /api/login` - User/Restaurant login
- `POST /api/forgot-password` - Request password reset
- `POST /api/reset-password` - Reset password with token
- `POST /api/change-password` - Change password (authenticated)

### Customer
- `GET /api/addresses` - Get user addresses
- `POST /api/addresses` - Add address
- `PUT /api/addresses/:id` - Update address
- `DELETE /api/addresses/:id` - Delete address
- `GET /api/wallet` - Get wallet balance
- `POST /api/wallet/add-money` - Add money to wallet
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark notification as read

### Restaurant
- `GET /api/restaurant/orders` - Get restaurant orders
- `PUT /api/restaurant/orders/:id/status` - Update order status
- `GET /api/coupons/restaurant` - Get restaurant coupons
- `POST /api/coupons` - Create coupon

### Delivery Partner
- `POST /api/delivery/signup` - Partner signup
- `POST /api/delivery/login` - Partner login
- `POST /api/delivery/status` - Update online/offline status
- `GET /api/delivery/orders/available` - Get available orders
- `POST /api/delivery/orders/accept` - Accept order
- `POST /api/delivery/orders/update-status` - Update delivery status
- `GET /api/delivery/earnings` - Get earnings

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/dashboard/stats` - Get dashboard statistics
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/users` - Get all users
- `GET /api/admin/restaurants` - Get all restaurants
- `PUT /api/admin/restaurants/:id/verify` - Verify restaurant

## 🔔 WebSocket Events

### Client → Server
```javascript
// Join room for real-time updates
socket.emit("join", { userId: 123, role: "customer" });
```

### Server → Client
```javascript
// Order status update
socket.on("order_update", (data) => {
  console.log("Order updated:", data);
});

// Order list update
socket.on("order_list_update", (data) => {
  console.log("Order list updated:", data);
});

// Notification
socket.on("notification", (data) => {
  console.log("New notification:", data);
});
```

## 🗄️ Database Schema

The database includes models for:
- **User** (Customers)
- **Restaurant**
- **DeliveryPartner**
- **Admin**
- **Order** (with status tracking)
- **MenuItem**
- **OrderItem**
- **Address** (Multiple addresses per user)
- **Wallet** & **WalletTransaction**
- **Payment**
- **Rating** & **Review**
- **Coupon**
- **Notification**

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up -d --build
```

## 🔧 Development

### Running Migrations

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy
```

### Viewing Database

```bash
# Open Prisma Studio
npx prisma studio
```

### Seeding Database

```bash
npm run prisma:seed
```

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ Email verification for password reset
- ✅ Secure token generation
- ✅ CORS configuration
- ✅ Input validation

## 📱 Frontend Pages

- `Main.html` - Landing page
- `login.html` - Login page
- `signup.html` - Signup page
- `forgot-password.html` - Forgot password
- `reset-password.html` - Reset password
- `CustomerDashboard.html` - Customer dashboard
- `RestaurantDashboard.html` - Restaurant dashboard
- `Profile.html` - User profile
- `MyOrders.html` - Order history
- `Cart.html` - Shopping cart
- `RestaurantView.html` - Restaurant details

## 🎨 UI/UX Features

- ✅ Modern, responsive design
- ✅ Smooth animations
- ✅ Real-time updates
- ✅ Image support
- ✅ Mobile-friendly
- ✅ Accessible design

## 🚧 Future Enhancements

- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] AI-based food recommendations
- [ ] Group ordering
- [ ] Scheduled orders
- [ ] Voice-based search
- [ ] Multi-language support
- [ ] Push notifications (FCM)
- [ ] SMS notifications
- [ ] Advanced analytics
- [ ] Surge pricing
- [ ] Loyalty points system

## 📝 License

ISC

## 👨‍💻 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for portfolio and startup projects**
