# 🧪 Comprehensive Testing Guide

## Prisma Query Fix Applied ✅

### Issue Fixed
- **File**: `Controller/restaurant.controller.js`
- **Function**: `getRestaurantProfile`
- **Problem**: Invalid Prisma query with `where` clause inside `include` for ratings
- **Solution**: Separated the queries - fetch restaurant first, then fetch ratings separately and combine

### Before (Broken):
```javascript
const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.user.id },
    include: {
        ratings: {
            where: { ratingType: "restaurant" }, // ❌ This caused the error
            include: { ... }
        }
    }
});
```

### After (Fixed):
```javascript
// First get the restaurant
const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.user.id }
});

// Then get restaurant ratings separately
const restaurantRatings = await prisma.rating.findMany({
    where: {
        restaurantId: req.user.id,
        ratingType: "restaurant"
    },
    include: {
        user: {
            select: { name: true, email: true }
        }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
});

// Combine restaurant with ratings
const restaurantWithRatings = {
    ...restaurant,
    ratings: restaurantRatings
};
```

---

## 🧪 Testing Checklist

### 1. Server Status ✅
- [x] Server running on port 6789
- [x] Database connected (PostgreSQL)
- [x] Redis connected
- [x] WebSocket server active

### 2. Authentication Tests
- [ ] Customer signup
- [ ] Customer login
- [ ] Restaurant signup
- [ ] Restaurant login
- [ ] Delivery partner signup
- [ ] Delivery partner login
- [ ] Password reset flow

### 3. Restaurant Endpoints Tests
- [ ] `GET /api/restaurant/me` - Get restaurant profile (FIXED ✅)
- [ ] `PUT /api/restaurant/update` - Update restaurant profile
- [ ] `GET /api/restaurant/orders` - Get restaurant orders
- [ ] `PUT /api/restaurant/orders/:id/status` - Update order status
- [ ] `GET /api/menu` - Get menu items
- [ ] `POST /api/menu` - Add menu item
- [ ] `PUT /api/menu/:id` - Update menu item
- [ ] `DELETE /api/menu/:id` - Delete menu item

### 4. Customer Endpoints Tests
- [ ] `GET /api/restaurants` - Browse restaurants
- [ ] `GET /api/restaurants/:id/menu` - Get restaurant menu
- [ ] `POST /api/orders` - Place order
- [ ] `GET /api/orders/my` - Get my orders
- [ ] `GET /api/addresses` - Get addresses
- [ ] `POST /api/addresses` - Add address
- [ ] `GET /api/wallet` - Get wallet balance
- [ ] `POST /api/wallet/add-money` - Add money to wallet
- [ ] `POST /api/ratings` - Add rating
- [ ] `GET /api/notifications` - Get notifications

### 5. Delivery Partner Endpoints Tests
- [ ] `POST /api/delivery/signup` - Partner signup
- [ ] `POST /api/delivery/login` - Partner login
- [ ] `POST /api/delivery/status` - Update online/offline status
- [ ] `GET /api/delivery/orders/available` - Get available orders
- [ ] `POST /api/delivery/orders/accept` - Accept order
- [ ] `POST /api/delivery/orders/update-status` - Update delivery status
- [ ] `GET /api/delivery/orders/my` - Get partner's orders
- [ ] `GET /api/delivery/earnings` - Get earnings

### 6. Order Flow End-to-End Test
1. [ ] Customer browses restaurants
2. [ ] Customer views restaurant menu
3. [ ] Customer adds items to cart
4. [ ] Customer places order
5. [ ] Restaurant receives order notification
6. [ ] Restaurant accepts order
7. [ ] Restaurant marks order as ready
8. [ ] Delivery partner sees available order
9. [ ] Delivery partner accepts order
10. [ ] Delivery partner picks up order
11. [ ] Delivery partner delivers order
12. [ ] Customer receives order
13. [ ] Customer rates restaurant and food
14. [ ] Wallet balances update correctly

### 7. Real-Time Features Tests
- [ ] WebSocket connection established
- [ ] Order status updates in real-time
- [ ] Notifications appear in real-time
- [ ] Order list refreshes automatically
- [ ] Rating updates broadcast correctly

### 8. Frontend Integration Tests
- [ ] Main.html loads correctly
- [ ] Login page works
- [ ] Signup page works
- [ ] Customer dashboard loads
- [ ] Restaurant dashboard loads
- [ ] Delivery dashboard loads
- [ ] Order tracking works
- [ ] Cart functionality works
- [ ] Profile pages work
- [ ] CSS styling applied correctly

---

## 🚀 Quick Test Commands

### Test Restaurant Profile (Fixed Endpoint)
```bash
# Login as restaurant first to get token
curl -X POST http://localhost:6789/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"restaurant@test.com","password":"test123","role":"restaurant-owner"}'

# Use the token to get profile
curl -X GET http://localhost:6789/api/restaurant/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test All Endpoints (Using Test Script)
```bash
# In browser console or Node.js
node test-endpoints.js
```

---

## 🔍 Manual Testing Steps

### Test Restaurant Profile Fix:
1. Start the server: `npm start`
2. Open browser: `http://localhost:6789/RestaurantProfile.html`
3. Login as restaurant owner
4. Check browser console - should see restaurant profile loaded
5. Verify ratings are included in the response
6. Check Network tab - `/api/restaurant/me` should return 200 OK

### Test Order Flow:
1. Login as customer
2. Browse restaurants
3. Add items to cart
4. Place order
5. Login as restaurant - see order
6. Accept order
7. Mark as ready
8. Login as delivery partner
9. Accept delivery
10. Update status to delivered
11. Login as customer - verify order completed
12. Rate the order

---

## ✅ Expected Results

### Restaurant Profile Endpoint:
```json
{
  "success": true,
  "restaurant": {
    "id": 1,
    "name": "Test Restaurant",
    "email": "restaurant@test.com",
    "address": "123 Main St",
    "phone": "1234567890",
    "rating": 4.5,
    "totalRatings": 10,
    "ratings": [
      {
        "id": 1,
        "rating": 5,
        "comment": "Great food!",
        "user": {
          "name": "John Doe",
          "email": "john@test.com"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 🐛 Common Issues & Solutions

### Issue: Prisma Query Error
**Error**: `Invalid 'prisma.restaurant.findUnique()' invocation`
**Solution**: ✅ Fixed by separating queries

### Issue: Ratings not showing
**Check**: 
- Ratings exist in database
- `ratingType` is set to "restaurant"
- Restaurant ID matches

### Issue: Authentication fails
**Check**:
- Token is valid
- Token hasn't expired
- User role matches endpoint requirement

### Issue: WebSocket not connecting
**Check**:
- Redis is running
- Socket.io server is active
- Client is connecting to correct URL

---

## 📝 Notes

- All endpoints should return JSON with `success` boolean
- Error messages should be descriptive
- Authentication tokens expire after 24 hours (default)
- WebSocket connections auto-reconnect on disconnect
- Database migrations should be run before testing

---

## 🎯 Next Steps

1. ✅ Fixed Prisma query error
2. ⏳ Test all endpoints manually
3. ⏳ Test order flow end-to-end
4. ⏳ Test real-time updates
5. ⏳ Test frontend integration
6. ⏳ Performance testing
7. ⏳ Load testing

---

**Last Updated**: After Prisma query fix
**Status**: ✅ Restaurant profile endpoint fixed and ready for testing

