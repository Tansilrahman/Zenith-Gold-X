import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { safeGet, safeRun } from '../models/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const validRoles = ['Citizen', 'Worker', 'Admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role selected.' });
        }

        const lowerEmail = email.toLowerCase();

        const existingUser = await safeGet('SELECT id FROM users WHERE email = ?', [lowerEmail]);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await safeRun(
            'INSERT INTO users (name, email, passwordHash, role) VALUES (?, ?, ?, ?)',
            [name, lowerEmail, passwordHash, role]
        );

        res.status(200).json({ message: 'Registration successful' });
    } catch (error) {
        console.error('Registration Error:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const lowerEmail = email.toLowerCase();
        const user = await safeGet('SELECT * FROM users WHERE email = ?', [lowerEmail]);

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: 'Login successful',
            token,
            role: user.role,
            name: user.name,
            id: user.id
        });
    } catch (error) {
        console.error('Login Error:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const me = async (req, res) => {
    try {
        const user = await safeGet(
            'SELECT id, name, email, role, walletBalance, successfulCollectionsCount FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Me Error:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export { register, login, me };
