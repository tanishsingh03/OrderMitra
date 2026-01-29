// --------------------------
// FILE: modules/auth/auth.middleware.js
// --------------------------
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

/**
 * Base authentication middleware - verifies JWT token
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        
        if (!authHeader) {
            console.error("❌ No authorization header provided");
            return res.status(401).json({ 
                success: false,
                message: "Access Denied: No token provided. Please login again." 
            });
        }

        const token = authHeader.split(" ")[1];
        
        if (!token) {
            console.error("❌ Token not found in authorization header");
            return res.status(401).json({ 
                success: false,
                message: "Access Denied: Invalid token format. Please login again." 
            });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Ensure decoded token has required fields
            if (!decoded.id) {
                console.error("❌ Token missing user ID");
                return res.status(401).json({ 
                    success: false,
                    message: "Access Denied: Invalid token. Please login again." 
                });
            }

            // Attach user info to request
            req.user = {
                id: decoded.id,
                role: decoded.role || null,
                ...decoded
            };

            console.log(`✅ Authenticated user ${req.user.id} with role ${req.user.role || 'none'}`);
            next();
        } catch (tokenError) {
            // Handle specific JWT errors
            if (tokenError.name === "TokenExpiredError") {
                console.error("❌ Token expired for user");
                return res.status(401).json({ 
                    success: false,
                    message: "Session expired. Please login again.",
                    code: "TOKEN_EXPIRED"
                });
            } else if (tokenError.name === "JsonWebTokenError") {
                console.error("❌ Invalid token:", tokenError.message);
                return res.status(401).json({ 
                    success: false,
                    message: "Invalid token. Please login again.",
                    code: "INVALID_TOKEN"
                });
            } else {
                console.error("❌ Token verification error:", tokenError);
                return res.status(401).json({ 
                    success: false,
                    message: "Authentication failed. Please login again.",
                    code: "AUTH_ERROR"
                });
            }
        }
    } catch (err) {
        console.error("❌ Authentication middleware error:", err);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error during authentication." 
        });
    }
};

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: "Access Denied: Authentication required." 
            });
        }

        const userRole = req.user.role;

        // Normalize role names (handle variations)
        const normalizedRole = userRole?.toLowerCase().replace(/_/g, "-");
        const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase().replace(/_/g, "-"));

        // Check if user role is allowed
        if (!normalizedAllowedRoles.includes(normalizedRole)) {
            console.error(`❌ Access denied: User ${req.user.id} with role '${userRole}' tried to access route requiring: ${allowedRoles.join(", ")}`);
            return res.status(403).json({ 
                success: false,
                message: `Access Denied: This action requires ${allowedRoles.join(" or ")} role.`,
                code: "INSUFFICIENT_PERMISSIONS"
            });
        }

        console.log(`✅ Authorized user ${req.user.id} with role ${userRole}`);
        next();
    };
};

/**
 * Combined authenticate + authorize middleware
 */
const requireAuth = (...allowedRoles) => {
    return [
        authenticate,
        ...(allowedRoles.length > 0 ? [authorize(...allowedRoles)] : [])
    ];
};

module.exports = { 
    authenticate, 
    authorize,
    requireAuth
};
