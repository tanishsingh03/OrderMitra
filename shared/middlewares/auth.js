const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  // 1. Check for Gateway forwarded user headers (Fast Path)
  const gatewayUserId = req.headers['x-user-id'];
  const gatewayUserRole = req.headers['x-user-role'];
  const gatewayUserEmail = req.headers['x-user-email'];

  if (gatewayUserId) {
    req.user = {
      id: parseInt(gatewayUserId, 10),
      role: gatewayUserRole,
      email: gatewayUserEmail
    };
    return next();
  }

  // 2. Direct request fallback: Validate JWT token directly (useful for local service tests)
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'secretkey';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    // Normalize user role uppercase matching DB Enum strings
    const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    const normalizedRoles = roles.map(r => r.toUpperCase());

    if (normalizedRoles.length > 0 && !normalizedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
