/**
 * auth.js — Phase 5 Middleware
 *
 * - Validates Bearer JWT
 * - Attaches decoded user to req.user
 * - Role guard via requireRole([...])
 * - Always returns structured JSON on failure
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

// ---------------------------------------------------------------
// verifyToken — validates Authorization: Bearer <jwt>
// ---------------------------------------------------------------
export function verifyToken(req, res, next) {
    const header = req.headers['authorization'];

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided.' });
    }

    const token = header.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized: Invalid or expired token.' });
        }
        req.user = decoded;
        req.userRole = decoded.role;
        next();
    });
}

// ---------------------------------------------------------------
// requireRole — role-based access guard
// ---------------------------------------------------------------
export function requireRole(roles) {
    return (req, res, next) => {
        if (!req.userRole || !roles.includes(req.userRole)) {
            return res.status(403).json({ message: 'Access denied: insufficient role.' });
        }
        next();
    };
}
