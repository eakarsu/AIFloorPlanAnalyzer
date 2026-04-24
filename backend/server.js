import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pool, { initDB } from './db.js';
import openrouterService from './services/openrouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' }
});
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/password-reset', authLimiter);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Convert any image data URL to PNG (handles AVIF, WebP, GIF, etc.)
async function ensurePngDataUrl(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
  try {
    const base64Data = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const pngBuffer = await sharp(buffer)
      .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Image conversion error:', err.message);
    return dataUrl; // Return original if conversion fails
  }
}

// Password strength validation
function validatePasswordStrength(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters long');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Password must contain at least one special character');
  return errors;
}

// Pagination helper
function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = query.search || '';
  const sort_by = query.sort_by || 'created_at';
  const sort_order = (query.sort_order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { page, limit, offset, search, sort_by, sort_order };
}

// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Check token blacklist
    const blacklisted = await pool.query(
      'SELECT id FROM token_blacklist WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      req.token = token;
      next();
    });
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// RBAC middleware
const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userRole = userResult.rows[0].role || 'user';
      if (!roles.includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions. Required role: ' + roles.join(' or ') });
      }
      req.userRole = userRole;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

// Initialize database on startup
initDB().catch(console.error);

// ============ AUTH ROUTES ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Password strength validation
    const passwordErrors = validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ error: 'Password too weak', details: passwordErrors });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      'INSERT INTO users (email, password, name, role, email_verified, email_verification_token) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role, email_verified',
      [email, hashedPassword, name, 'user', false, verificationToken]
    );

    const token = jwt.sign({ id: result.rows[0].id, email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      user: result.rows[0],
      token,
      verificationToken,
      message: 'Registration successful. Please verify your email.'
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role || 'user', email_verified: user.email_verified },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, email_verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;

    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3 RETURNING id, email, name, created_at',
      [name, email, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get current user
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password strength
    const passwordErrors = validatePasswordStrength(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ error: 'New password too weak', details: passwordErrors });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Add token to blacklist
    const decoded = jwt.decode(req.token);
    const expiresAt = new Date(decoded.exp * 1000);
    await pool.query(
      'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2)',
      [req.token, expiresAt]
    );
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Password reset request
app.post('/api/auth/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body;
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      // Don't reveal whether email exists
      return res.json({ message: 'If the email exists, a reset token has been generated' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userResult.rows[0].id, resetToken, expiresAt]
    );

    // In production, send email with reset link. Here we return the token for dev.
    res.json({ message: 'If the email exists, a reset token has been generated', resetToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Password reset confirm
app.post('/api/auth/password-reset/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const passwordErrors = validatePasswordStrength(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ error: 'Password too weak', details: passwordErrors });
    }

    const tokenResult = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = false',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, tokenResult.rows[0].user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenResult.rows[0].id]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Email verification
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const result = await pool.query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL WHERE email_verification_token = $1 RETURNING id, email, name, role, email_verified',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    res.json({ message: 'Email verified successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resend verification email
app.post('/api/auth/resend-verification', authenticateToken, async (req, res) => {
  try {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'UPDATE users SET email_verification_token = $1 WHERE id = $2',
      [verificationToken, req.user.id]
    );
    res.json({ message: 'Verification token resent', verificationToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: List all users (RBAC protected)
app.get('/api/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { page, limit, offset, search, sort_by, sort_order } = getPaginationParams(req.query);
    const allowedSortCols = ['id', 'name', 'email', 'role', 'created_at'];
    const sortCol = allowedSortCols.includes(sort_by) ? sort_by : 'created_at';

    let query = 'SELECT id, email, name, role, email_verified, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) FROM users';
    const params = [];
    const countParams = [];

    if (search) {
      const searchClause = ` WHERE name ILIKE $1 OR email ILIKE $1`;
      query += searchClause;
      countQuery += searchClause;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ` ORDER BY ${sortCol} ${sort_order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update user role (RBAC protected)
app.put('/api/admin/users/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'editor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be: user, admin, or editor' });
    }
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role, email_verified',
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ FLOOR PLANS ROUTES ============

app.get('/api/floor-plans', authenticateToken, async (req, res) => {
  try {
    const { page, limit, offset, search, sort_by, sort_order } = getPaginationParams(req.query);
    const allowedSortCols = ['id', 'name', 'total_area', 'status', 'created_at', 'updated_at'];
    const sortCol = allowedSortCols.includes(sort_by) ? `fp.${sort_by}` : 'fp.created_at';

    let baseQuery = `FROM floor_plans fp WHERE fp.user_id = $1`;
    const params = [req.user.id];
    const countParams = [req.user.id];

    if (search) {
      baseQuery += ` AND (fp.name ILIKE $${params.length + 1} OR fp.description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    const dataQuery = `SELECT fp.*,
      (SELECT COUNT(*) FROM rooms WHERE floor_plan_id = fp.id) as room_count,
      (SELECT COUNT(*) FROM renovation_suggestions WHERE floor_plan_id = fp.id) as suggestion_count
     ${baseQuery} ORDER BY ${sortCol} ${sort_order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) ${baseQuery}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/floor-plans/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM floor_plans WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }

    // Get rooms
    const rooms = await pool.query(
      'SELECT * FROM rooms WHERE floor_plan_id = $1 ORDER BY name',
      [req.params.id]
    );

    // Get suggestions
    const suggestions = await pool.query(
      'SELECT * FROM renovation_suggestions WHERE floor_plan_id = $1 ORDER BY priority DESC',
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      rooms: rooms.rows,
      suggestions: suggestions.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/floor-plans', authenticateToken, async (req, res) => {
  try {
    const { name, description, total_area, unit, image_data } = req.body;

    const result = await pool.query(
      `INSERT INTO floor_plans (user_id, name, description, total_area, unit, image_data, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [req.user.id, name, description, total_area, unit || 'sqft', image_data]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/floor-plans/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, total_area, unit, status } = req.body;

    const result = await pool.query(
      `UPDATE floor_plans
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           total_area = COALESCE($3, total_area),
           unit = COALESCE($4, unit),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, description, total_area, unit, status, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/floor-plans/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM floor_plans WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }

    res.json({ message: 'Floor plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ROOMS ROUTES ============

app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id } = req.query;
    const { page, limit, offset, search, sort_by, sort_order } = getPaginationParams(req.query);
    const allowedSortCols = ['id', 'name', 'room_type', 'area', 'width', 'length', 'created_at'];
    const sortCol = allowedSortCols.includes(sort_by) ? `r.${sort_by}` : 'r.created_at';

    let baseQuery = `FROM rooms r JOIN floor_plans fp ON r.floor_plan_id = fp.id WHERE fp.user_id = $1`;
    const params = [req.user.id];
    const countParams = [req.user.id];

    if (floor_plan_id) {
      baseQuery += ` AND r.floor_plan_id = $${params.length + 1}`;
      params.push(floor_plan_id);
      countParams.push(floor_plan_id);
    }

    if (search) {
      baseQuery += ` AND (r.name ILIKE $${params.length + 1} OR r.room_type ILIKE $${params.length + 1} OR r.notes ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    const dataQuery = `SELECT r.*, fp.name as floor_plan_name ${baseQuery} ORDER BY ${sortCol} ${sort_order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(`SELECT COUNT(*) ${baseQuery}`, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, fp.name as floor_plan_name
       FROM rooms r
       JOIN floor_plans fp ON r.floor_plan_id = fp.id
       WHERE r.id = $1 AND fp.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id, name, room_type, width, length, height, notes } = req.body;

    // Verify floor plan belongs to user
    const fpCheck = await pool.query(
      'SELECT id FROM floor_plans WHERE id = $1 AND user_id = $2',
      [floor_plan_id, req.user.id]
    );

    if (fpCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const area = width && length ? width * length : null;

    const result = await pool.query(
      `INSERT INTO rooms (floor_plan_id, name, room_type, width, length, height, area, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [floor_plan_id, name, room_type, width, length, height || 9, area, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/rooms/:id', authenticateToken, async (req, res) => {
  try {
    const { name, room_type, width, length, height, notes } = req.body;
    const area = width && length ? width * length : null;

    const result = await pool.query(
      `UPDATE rooms r
       SET name = COALESCE($1, name),
           room_type = COALESCE($2, room_type),
           width = COALESCE($3, width),
           length = COALESCE($4, length),
           height = COALESCE($5, height),
           area = COALESCE($6, area),
           notes = COALESCE($7, notes)
       FROM floor_plans fp
       WHERE r.id = $8 AND r.floor_plan_id = fp.id AND fp.user_id = $9
       RETURNING r.*`,
      [name, room_type, width, length, height, area, notes, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rooms/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM rooms r
       USING floor_plans fp
       WHERE r.id = $1 AND r.floor_plan_id = fp.id AND fp.user_id = $2
       RETURNING r.id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ RENOVATION SUGGESTIONS ROUTES ============

app.get('/api/suggestions', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id, room_id } = req.query;
    const { page, limit, offset, search, sort_by, sort_order } = getPaginationParams(req.query);
    const allowedSortCols = ['id', 'title', 'category', 'priority', 'estimated_cost', 'difficulty', 'status', 'created_at'];
    const sortCol = allowedSortCols.includes(sort_by) ? `rs.${sort_by}` : 'rs.created_at';

    let baseQuery = `FROM renovation_suggestions rs LEFT JOIN rooms r ON rs.room_id = r.id JOIN floor_plans fp ON rs.floor_plan_id = fp.id WHERE fp.user_id = $1`;
    const params = [req.user.id];
    const countParams = [req.user.id];

    if (floor_plan_id) {
      baseQuery += ` AND rs.floor_plan_id = $${params.length + 1}`;
      params.push(floor_plan_id);
      countParams.push(floor_plan_id);
    }

    if (room_id) {
      baseQuery += ` AND rs.room_id = $${params.length + 1}`;
      params.push(room_id);
      countParams.push(room_id);
    }

    if (search) {
      baseQuery += ` AND (rs.title ILIKE $${params.length + 1} OR rs.description ILIKE $${params.length + 1} OR rs.category ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    const dataQuery = `SELECT rs.*, r.name as room_name, fp.name as floor_plan_name ${baseQuery} ORDER BY ${sortCol} ${sort_order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(`SELECT COUNT(*) ${baseQuery}`, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/suggestions/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rs.*, r.name as room_name, fp.name as floor_plan_name
       FROM renovation_suggestions rs
       LEFT JOIN rooms r ON rs.room_id = r.id
       JOIN floor_plans fp ON rs.floor_plan_id = fp.id
       WHERE rs.id = $1 AND fp.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suggestions', authenticateToken, async (req, res) => {
  try {
    const {
      floor_plan_id, room_id, title, description, category,
      priority, estimated_cost, difficulty, timeline, status
    } = req.body;

    // Verify floor plan belongs to user
    const fpCheck = await pool.query(
      'SELECT id FROM floor_plans WHERE id = $1 AND user_id = $2',
      [floor_plan_id, req.user.id]
    );

    if (fpCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `INSERT INTO renovation_suggestions
       (floor_plan_id, room_id, title, description, category, priority, estimated_cost, difficulty, timeline, status, ai_generated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
       RETURNING *`,
      [floor_plan_id, room_id, title, description, category, priority, estimated_cost, difficulty, timeline, status || 'pending']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/suggestions/:id', authenticateToken, async (req, res) => {
  try {
    const {
      title, description, category, priority,
      estimated_cost, difficulty, timeline, status
    } = req.body;

    const result = await pool.query(
      `UPDATE renovation_suggestions rs
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           priority = COALESCE($4, priority),
           estimated_cost = COALESCE($5, estimated_cost),
           difficulty = COALESCE($6, difficulty),
           timeline = COALESCE($7, timeline),
           status = COALESCE($8, status)
       FROM floor_plans fp
       WHERE rs.id = $9 AND rs.floor_plan_id = fp.id AND fp.user_id = $10
       RETURNING rs.*`,
      [title, description, category, priority, estimated_cost, difficulty, timeline, status, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/suggestions/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM renovation_suggestions rs
       USING floor_plans fp
       WHERE rs.id = $1 AND rs.floor_plan_id = fp.id AND fp.user_id = $2
       RETURNING rs.id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({ message: 'Suggestion deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MATERIALS ROUTES ============

app.get('/api/materials', async (req, res) => {
  try {
    const { category } = req.query;
    const { page, limit, offset, search, sort_by, sort_order } = getPaginationParams(req.query);
    const allowedSortCols = ['id', 'name', 'category', 'unit_price', 'supplier', 'in_stock', 'created_at'];
    const sortCol = allowedSortCols.includes(sort_by) ? sort_by : 'name';

    let baseQuery = 'FROM materials WHERE 1=1';
    const params = [];
    const countParams = [];

    if (category) {
      baseQuery += ` AND category = $${params.length + 1}`;
      params.push(category);
      countParams.push(category);
    }

    if (search) {
      baseQuery += ` AND (name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1} OR supplier ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    const dataQuery = `SELECT * ${baseQuery} ORDER BY ${sortCol} ${sort_order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(`SELECT COUNT(*) ${baseQuery}`, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/materials/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materials WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/materials', authenticateToken, async (req, res) => {
  try {
    const { name, category, description, unit_price, unit, supplier, in_stock } = req.body;

    const result = await pool.query(
      `INSERT INTO materials (name, category, description, unit_price, unit, supplier, in_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, category, description, unit_price, unit, supplier, in_stock ?? true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/materials/:id', authenticateToken, async (req, res) => {
  try {
    const { name, category, description, unit_price, unit, supplier, in_stock } = req.body;

    const result = await pool.query(
      `UPDATE materials
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           unit_price = COALESCE($4, unit_price),
           unit = COALESCE($5, unit),
           supplier = COALESCE($6, supplier),
           in_stock = COALESCE($7, in_stock)
       WHERE id = $8
       RETURNING *`,
      [name, category, description, unit_price, unit, supplier, in_stock, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/materials/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM materials WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PROJECT ESTIMATES ROUTES ============

app.get('/api/estimates', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id } = req.query;
    const { page, limit, offset, search, sort_by, sort_order } = getPaginationParams(req.query);
    const allowedSortCols = ['id', 'name', 'labor_cost', 'material_cost', 'total_cost', 'timeline_days', 'status', 'created_at'];
    const sortCol = allowedSortCols.includes(sort_by) ? `pe.${sort_by}` : 'pe.created_at';

    let baseQuery = `FROM project_estimates pe JOIN floor_plans fp ON pe.floor_plan_id = fp.id WHERE fp.user_id = $1`;
    const params = [req.user.id];
    const countParams = [req.user.id];

    if (floor_plan_id) {
      baseQuery += ` AND pe.floor_plan_id = $${params.length + 1}`;
      params.push(floor_plan_id);
      countParams.push(floor_plan_id);
    }

    if (search) {
      baseQuery += ` AND (pe.name ILIKE $${params.length + 1} OR pe.description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    const dataQuery = `SELECT pe.*, fp.name as floor_plan_name ${baseQuery} ORDER BY ${sortCol} ${sort_order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(`SELECT COUNT(*) ${baseQuery}`, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/estimates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pe.*, fp.name as floor_plan_name
       FROM project_estimates pe
       JOIN floor_plans fp ON pe.floor_plan_id = fp.id
       WHERE pe.id = $1 AND fp.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/estimates', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id, name, description, labor_cost, material_cost, timeline_days, status } = req.body;

    // Verify floor plan belongs to user
    const fpCheck = await pool.query(
      'SELECT id FROM floor_plans WHERE id = $1 AND user_id = $2',
      [floor_plan_id, req.user.id]
    );

    if (fpCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const total_cost = (labor_cost || 0) + (material_cost || 0);

    const result = await pool.query(
      `INSERT INTO project_estimates (floor_plan_id, name, description, labor_cost, material_cost, total_cost, timeline_days, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [floor_plan_id, name, description, labor_cost, material_cost, total_cost, timeline_days, status || 'draft']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/estimates/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, labor_cost, material_cost, timeline_days, status } = req.body;

    const result = await pool.query(
      `UPDATE project_estimates pe
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           labor_cost = COALESCE($3, labor_cost),
           material_cost = COALESCE($4, material_cost),
           total_cost = COALESCE($3, labor_cost) + COALESCE($4, material_cost),
           timeline_days = COALESCE($5, timeline_days),
           status = COALESCE($6, status)
       FROM floor_plans fp
       WHERE pe.id = $7 AND pe.floor_plan_id = fp.id AND fp.user_id = $8
       RETURNING pe.*`,
      [name, description, labor_cost, material_cost, timeline_days, status, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/estimates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM project_estimates pe
       USING floor_plans fp
       WHERE pe.id = $1 AND pe.floor_plan_id = fp.id AND fp.user_id = $2
       RETURNING pe.id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json({ message: 'Estimate deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DESIGN TEMPLATES ROUTES ============

app.get('/api/templates', async (req, res) => {
  try {
    const { style, room_type } = req.query;
    const { page, limit, offset, search, sort_by, sort_order } = getPaginationParams(req.query);
    const allowedSortCols = ['id', 'name', 'style', 'room_type', 'popularity', 'created_at'];
    const sortCol = allowedSortCols.includes(sort_by) ? sort_by : 'popularity';

    let baseQuery = 'FROM design_templates WHERE 1=1';
    const params = [];
    const countParams = [];

    if (style) {
      baseQuery += ` AND style = $${params.length + 1}`;
      params.push(style);
      countParams.push(style);
    }

    if (room_type) {
      baseQuery += ` AND room_type = $${params.length + 1}`;
      params.push(room_type);
      countParams.push(room_type);
    }

    if (search) {
      baseQuery += ` AND (name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1} OR style ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    const dataQuery = `SELECT * ${baseQuery} ORDER BY ${sortCol} ${sort_order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(`SELECT COUNT(*) ${baseQuery}`, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/templates/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM design_templates WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/templates', authenticateToken, async (req, res) => {
  try {
    const { name, style, description, room_type, features, color_palette } = req.body;

    const result = await pool.query(
      `INSERT INTO design_templates (name, style, description, room_type, features, color_palette)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, style, description, room_type, JSON.stringify(features), JSON.stringify(color_palette)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { name, style, description, room_type, features, color_palette } = req.body;

    const result = await pool.query(
      `UPDATE design_templates
       SET name = COALESCE($1, name),
           style = COALESCE($2, style),
           description = COALESCE($3, description),
           room_type = COALESCE($4, room_type),
           features = COALESCE($5, features),
           color_palette = COALESCE($6, color_palette)
       WHERE id = $7
       RETURNING *`,
      [name, style, description, room_type, features ? JSON.stringify(features) : null, color_palette ? JSON.stringify(color_palette) : null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM design_templates WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONTRACTORS ROUTES ============

app.get('/api/contractors', async (req, res) => {
  try {
    const { specialty, availability } = req.query;
    const { page, limit, offset, search, sort_by, sort_order } = getPaginationParams(req.query);
    const allowedSortCols = ['id', 'name', 'company', 'specialty', 'rating', 'hourly_rate', 'availability', 'location', 'created_at'];
    const sortCol = allowedSortCols.includes(sort_by) ? sort_by : 'rating';

    let baseQuery = 'FROM contractors WHERE 1=1';
    const params = [];
    const countParams = [];

    if (specialty) {
      baseQuery += ` AND specialty = $${params.length + 1}`;
      params.push(specialty);
      countParams.push(specialty);
    }

    if (availability) {
      baseQuery += ` AND availability = $${params.length + 1}`;
      params.push(availability);
      countParams.push(availability);
    }

    if (search) {
      baseQuery += ` AND (name ILIKE $${params.length + 1} OR company ILIKE $${params.length + 1} OR specialty ILIKE $${params.length + 1} OR location ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    const dataQuery = `SELECT * ${baseQuery} ORDER BY ${sortCol} ${sort_order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(`SELECT COUNT(*) ${baseQuery}`, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/contractors/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contractors WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contractors', authenticateToken, async (req, res) => {
  try {
    const { name, company, specialty, email, phone, rating, hourly_rate, availability, location, verified } = req.body;

    const result = await pool.query(
      `INSERT INTO contractors (name, company, specialty, email, phone, rating, hourly_rate, availability, location, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, company, specialty, email, phone, rating, hourly_rate, availability, location, verified ?? false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/contractors/:id', authenticateToken, async (req, res) => {
  try {
    const { name, company, specialty, email, phone, rating, hourly_rate, availability, location, verified } = req.body;

    const result = await pool.query(
      `UPDATE contractors
       SET name = COALESCE($1, name),
           company = COALESCE($2, company),
           specialty = COALESCE($3, specialty),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone),
           rating = COALESCE($6, rating),
           hourly_rate = COALESCE($7, hourly_rate),
           availability = COALESCE($8, availability),
           location = COALESCE($9, location),
           verified = COALESCE($10, verified)
       WHERE id = $11
       RETURNING *`,
      [name, company, specialty, email, phone, rating, hourly_rate, availability, location, verified, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/contractors/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM contractors WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json({ message: 'Contractor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AI ANALYSIS ROUTES ============

app.post('/api/ai/analyze', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { floor_plan_id, analysis_type } = req.body;
    let imageBase64 = req.body.image_data;

    if (req.file) {
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // Convert to PNG and resize for AI vision API compatibility
    imageBase64 = await ensurePngDataUrl(imageBase64);

    const result = await openrouterService.analyzeFloorPlan(imageBase64, analysis_type || 'full');

    // Auto-create a floor plan entry if user uploaded an image without selecting one
    let effectiveFloorPlanId = floor_plan_id;
    if (result.success && !effectiveFloorPlanId && imageBase64) {
      const fpResult = await pool.query(
        `INSERT INTO floor_plans (user_id, name, image_data, status) VALUES ($1, $2, $3, 'analyzed') RETURNING id`,
        [req.user.id, `Uploaded Analysis - ${new Date().toLocaleDateString()}`, imageBase64]
      );
      effectiveFloorPlanId = fpResult.rows[0].id;
    }

    if (result.success && effectiveFloorPlanId) {
      // Save to ai_analysis history table
      await pool.query(
        `INSERT INTO ai_analysis (floor_plan_id, analysis_type, prompt, result, model_used, tokens_used, processing_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          effectiveFloorPlanId,
          analysis_type || 'full',
          'Floor plan analysis',
          JSON.stringify({ analysis: result.analysis }),
          result.model,
          result.usage?.totalTokens,
          result.processingTimeMs
        ]
      );

      // Save to appropriate table based on analysis_type
      const type = analysis_type || 'full';

      // Try to parse JSON from AI response
      let parsedData = null;
      try {
        const content = result.analysis;

        // First try to find JSON in code block (at the end of response)
        const codeBlockMatches = content.match(/```json\s*([\s\S]*?)\s*```/g);
        if (codeBlockMatches && codeBlockMatches.length > 0) {
          // Get the last code block (should be the data for storage)
          const lastBlock = codeBlockMatches[codeBlockMatches.length - 1];
          const jsonContent = lastBlock.replace(/```json\s*/, '').replace(/\s*```/, '');
          console.log('Found JSON in code block:', jsonContent.substring(0, 100));
          parsedData = JSON.parse(jsonContent.trim());
        } else {
          // Fallback: find all JSON objects/arrays in the response
          // For cost type, look for object with cost-related fields
          if (type === 'cost') {
            const costMatch = content.match(/\{\s*"(?:labor_cost|total_cost|total_estimated_cost|labor)"[^}]+\}/);
            if (costMatch) {
              console.log('Found cost JSON object');
              parsedData = JSON.parse(costMatch[0]);
            }
          } else {
            // For array types (dimensions, suggestions, materials)
            const arrayMatch = content.match(/\[\s*\{[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\}\s*)*\]/);
            if (arrayMatch) {
              console.log('Found JSON array');
              parsedData = JSON.parse(arrayMatch[0]);
            }
          }
        }

        if (parsedData) {
          console.log('Parsed data for type:', type);
          console.log('isArray:', Array.isArray(parsedData));
          console.log('Keys:', Object.keys(Array.isArray(parsedData) ? parsedData[0] || {} : parsedData));
        } else {
          console.log('No parsable JSON found for type:', type);
        }
      } catch (e) {
        console.log('Could not parse AI response as JSON:', e.message);
        console.log('AI response preview:', result.analysis.substring(0, 300));
      }

      // Save to appropriate table based on type
      if (type === 'full') {
        // Save to full_analyses table
        await pool.query(
          `INSERT INTO full_analyses (floor_plan_id, full_result, model_used)
           VALUES ($1, $2, $3)`,
          [effectiveFloorPlanId, result.analysis, result.model]
        );
        console.log('Saved to full_analyses');
      } else if (type === 'dimensions') {
        // Save to room_dimensions table with full_result
        await pool.query(
          `INSERT INTO room_dimensions (floor_plan_id, full_result, model_used, ai_generated)
           VALUES ($1, $2, $3, true)`,
          [effectiveFloorPlanId, result.analysis, result.model]
        );
        console.log('Saved to room_dimensions');
      } else if (type === 'suggestions') {
        // Save to ai_suggestions table
        await pool.query(
          `INSERT INTO ai_suggestions (floor_plan_id, full_result, model_used)
           VALUES ($1, $2, $3)`,
          [effectiveFloorPlanId, result.analysis, result.model]
        );
        console.log('Saved to ai_suggestions');
      } else if (type === 'materials') {
        // Save to ai_materials table
        await pool.query(
          `INSERT INTO ai_materials (floor_plan_id, full_result, model_used)
           VALUES ($1, $2, $3)`,
          [effectiveFloorPlanId, result.analysis, result.model]
        );
        console.log('Saved to ai_materials');
      } else if (type === 'optimize') {
        // Save to layout_optimizations table - always save full result
        const trafficFlow = parsedData?.traffic_flow || parsedData?.trafficFlow || '';
        const efficiencyScore = parsedData?.efficiency_score || parsedData?.efficiencyScore || null;
        const naturalLight = parsedData?.natural_light || parsedData?.naturalLight || '';
        const privacyAnalysis = parsedData?.privacy_analysis || parsedData?.privacyAnalysis || '';
        const noiseZones = parsedData?.noise_zones || parsedData?.noiseZones || '';
        const furnitureSuggestions = parsedData?.furniture_suggestions || parsedData?.furnitureSuggestions || '';
        const layoutModifications = parsedData?.layout_modifications || parsedData?.layoutModifications || '';

        console.log('Layout optimization data:', { trafficFlow: !!trafficFlow, efficiencyScore, hasFullResult: !!result.analysis });

        await pool.query(
          `INSERT INTO layout_optimizations (floor_plan_id, traffic_flow, efficiency_score, natural_light, privacy_analysis, noise_zones, furniture_suggestions, layout_modifications, full_result, model_used)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            effectiveFloorPlanId,
            trafficFlow,
            efficiencyScore,
            naturalLight,
            privacyAnalysis,
            noiseZones,
            furnitureSuggestions,
            layoutModifications,
            result.analysis,
            result.model
          ]
        );
      } else if (type === 'cost') {
        // Save to project_estimates table - handle various field name formats
        const laborCost = parsedData?.labor_cost || parsedData?.laborCost || parsedData?.labor || 0;
        const materialCost = parsedData?.material_cost || parsedData?.materialCost || parsedData?.materials || 0;
        const totalCost = parsedData?.total_cost || parsedData?.totalCost || parsedData?.total || parsedData?.total_estimated_cost || 0;
        const timelineDays = parsedData?.timeline_days || parsedData?.timelineDays || parsedData?.timeline || parsedData?.duration || null;

        console.log('Cost estimate data:', { laborCost, materialCost, totalCost, timelineDays });

        await pool.query(
          `INSERT INTO project_estimates (floor_plan_id, name, description, labor_cost, material_cost, total_cost, timeline_days, status, ai_generated)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [
            effectiveFloorPlanId,
            'AI Cost Estimate',
            result.analysis,
            laborCost,
            materialCost,
            totalCost,
            timelineDays,
            'draft'
          ]
        );
      }

      // Update floor plan status
      await pool.query(
        `UPDATE floor_plans SET status = 'analyzed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [effectiveFloorPlanId]
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/suggestions', authenticateToken, async (req, res) => {
  try {
    const { room_id } = req.body;

    // Get room data
    const roomResult = await pool.query(
      `SELECT r.* FROM rooms r
       JOIN floor_plans fp ON r.floor_plan_id = fp.id
       WHERE r.id = $1 AND fp.user_id = $2`,
      [room_id, req.user.id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomResult.rows[0];
    const result = await openrouterService.generateRenovationSuggestions(room);

    // Save to ai_analysis table and renovation_suggestions table
    if (result.success) {
      await pool.query(
        `INSERT INTO ai_analysis (floor_plan_id, analysis_type, prompt, result, model_used, tokens_used, processing_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          room.floor_plan_id,
          'suggestions',
          `Renovation suggestions for ${room.name}`,
          JSON.stringify({ suggestions: result.suggestions }),
          result.model,
          result.usage?.totalTokens,
          result.processingTimeMs
        ]
      );

      // Save suggestions to renovation_suggestions table
      if (Array.isArray(result.suggestions)) {
        for (const suggestion of result.suggestions) {
          await pool.query(
            `INSERT INTO renovation_suggestions (floor_plan_id, room_id, title, description, category, priority, estimated_cost, difficulty, timeline, status, ai_generated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', true)`,
            [
              room.floor_plan_id,
              room_id,
              suggestion.title || 'AI Suggestion',
              suggestion.description || '',
              suggestion.category || 'other',
              suggestion.priority || 'medium',
              suggestion.estimated_cost || 0,
              suggestion.difficulty || 'moderate',
              suggestion.timeline || ''
            ]
          );
        }
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/estimate', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id } = req.body;

    // Get floor plan with rooms
    const fpResult = await pool.query(
      `SELECT * FROM floor_plans WHERE id = $1 AND user_id = $2`,
      [floor_plan_id, req.user.id]
    );

    if (fpResult.rows.length === 0) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }

    const roomsResult = await pool.query(
      'SELECT * FROM rooms WHERE floor_plan_id = $1',
      [floor_plan_id]
    );

    const projectDetails = {
      ...fpResult.rows[0],
      rooms: roomsResult.rows
    };

    const result = await openrouterService.estimateCosts(projectDetails);

    // Save to ai_analysis table and project_estimates table
    if (result.success) {
      await pool.query(
        `INSERT INTO ai_analysis (floor_plan_id, analysis_type, prompt, result, model_used, tokens_used, processing_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          floor_plan_id,
          'estimate',
          `Cost estimate for ${fpResult.rows[0].name}`,
          JSON.stringify({ estimate: result.estimate }),
          result.model,
          result.usage?.totalTokens,
          result.processingTimeMs
        ]
      );

      // Save estimate to project_estimates table
      if (result.estimateData) {
        const ed = result.estimateData;
        await pool.query(
          `INSERT INTO project_estimates (floor_plan_id, name, description, labor_cost, material_cost, timeline_days, status, ai_generated)
           VALUES ($1, $2, $3, $4, $5, $6, 'draft', true)`,
          [
            floor_plan_id,
            ed.name || `AI Estimate for ${fpResult.rows[0].name}`,
            ed.description || 'AI-generated cost estimate',
            ed.labor_cost || 0,
            ed.material_cost || 0,
            ed.timeline_days || 0
          ]
        );
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/materials', authenticateToken, async (req, res) => {
  try {
    const { room_id, style } = req.body;

    // Get room data
    const roomResult = await pool.query(
      `SELECT r.* FROM rooms r
       JOIN floor_plans fp ON r.floor_plan_id = fp.id
       WHERE r.id = $1 AND fp.user_id = $2`,
      [room_id, req.user.id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomResult.rows[0];
    const result = await openrouterService.recommendMaterials(room, style);

    // Save to ai_analysis table and materials table
    if (result.success) {
      await pool.query(
        `INSERT INTO ai_analysis (floor_plan_id, analysis_type, prompt, result, model_used, tokens_used, processing_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          room.floor_plan_id,
          'materials',
          `Material recommendations for ${room.name}`,
          JSON.stringify({ recommendations: result.recommendations }),
          result.model,
          result.usage?.totalTokens,
          result.processingTimeMs
        ]
      );

      // Save materials to materials table
      if (Array.isArray(result.materials)) {
        for (const material of result.materials) {
          await pool.query(
            `INSERT INTO materials (name, category, description, unit_price, unit, supplier, in_stock, ai_generated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true)
             ON CONFLICT (name) DO NOTHING`,
            [
              material.name || 'AI Material',
              material.category || 'other',
              material.description || '',
              material.unit_price || 0,
              material.unit || 'unit',
              material.supplier || 'AI Recommended',
              material.in_stock !== false
            ]
          );
        }
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/optimize', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id } = req.body;

    // Get floor plan with rooms
    const fpResult = await pool.query(
      `SELECT * FROM floor_plans WHERE id = $1 AND user_id = $2`,
      [floor_plan_id, req.user.id]
    );

    if (fpResult.rows.length === 0) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }

    const roomsResult = await pool.query(
      'SELECT * FROM rooms WHERE floor_plan_id = $1',
      [floor_plan_id]
    );

    const floorPlanData = {
      ...fpResult.rows[0],
      rooms: roomsResult.rows
    };

    const result = await openrouterService.analyzeLayoutOptimization(floorPlanData);

    // Save to ai_analysis table and layout_optimizations table
    if (result.success) {
      await pool.query(
        `INSERT INTO ai_analysis (floor_plan_id, analysis_type, prompt, result, model_used, tokens_used, processing_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          floor_plan_id,
          'optimize',
          `Layout optimization for ${fpResult.rows[0].name}`,
          JSON.stringify({ optimization: result.optimization }),
          result.model,
          result.usage?.totalTokens,
          result.processingTimeMs
        ]
      );

      // Save to layout_optimizations table
      await pool.query(
        `INSERT INTO layout_optimizations (floor_plan_id, full_result, model_used)
         VALUES ($1, $2, $3)`,
        [floor_plan_id, result.optimization, result.model]
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI analysis history
app.get('/api/ai/history', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id } = req.query;
    let query = `
      SELECT aa.*, fp.name as floor_plan_name
      FROM ai_analysis aa
      JOIN floor_plans fp ON aa.floor_plan_id = fp.id
      WHERE fp.user_id = $1
    `;
    const params = [req.user.id];

    if (floor_plan_id) {
      query += ' AND aa.floor_plan_id = $2';
      params.push(floor_plan_id);
    }

    query += ' ORDER BY aa.created_at DESC LIMIT 50';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Full Analyses
app.get('/api/full-analyses', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fa.*, fp.name as floor_plan_name
       FROM full_analyses fa
       JOIN floor_plans fp ON fa.floor_plan_id = fp.id
       WHERE fp.user_id = $1
       ORDER BY fa.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Room Dimensions
app.get('/api/room-dimensions', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id } = req.query;
    let query = `
      SELECT rd.*, fp.name as floor_plan_name
      FROM room_dimensions rd
      JOIN floor_plans fp ON rd.floor_plan_id = fp.id
      WHERE fp.user_id = $1
    `;
    const params = [req.user.id];

    if (floor_plan_id) {
      query += ' AND rd.floor_plan_id = $2';
      params.push(floor_plan_id);
    }

    query += ' ORDER BY rd.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Layout Optimizations
app.get('/api/layout-optimizations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lo.*, fp.name as floor_plan_name
       FROM layout_optimizations lo
       JOIN floor_plans fp ON lo.floor_plan_id = fp.id
       WHERE fp.user_id = $1
       ORDER BY lo.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Full Analysis
app.delete('/api/full-analyses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Verify ownership
    const check = await pool.query(
      `SELECT fa.id FROM full_analyses fa
       JOIN floor_plans fp ON fa.floor_plan_id = fp.id
       WHERE fa.id = $1 AND fp.user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    await pool.query('DELETE FROM full_analyses WHERE id = $1', [id]);
    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Room Dimension
app.delete('/api/room-dimensions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Verify ownership
    const check = await pool.query(
      `SELECT rd.id FROM room_dimensions rd
       JOIN floor_plans fp ON rd.floor_plan_id = fp.id
       WHERE rd.id = $1 AND fp.user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Dimension not found' });
    }
    await pool.query('DELETE FROM room_dimensions WHERE id = $1', [id]);
    res.json({ message: 'Dimension deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Layout Optimization
app.delete('/api/layout-optimizations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Verify ownership
    const check = await pool.query(
      `SELECT lo.id FROM layout_optimizations lo
       JOIN floor_plans fp ON lo.floor_plan_id = fp.id
       WHERE lo.id = $1 AND fp.user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Optimization not found' });
    }
    await pool.query('DELETE FROM layout_optimizations WHERE id = $1', [id]);
    res.json({ message: 'Optimization deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI Suggestions
app.get('/api/ai-suggestions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, fp.name as floor_plan_name
       FROM ai_suggestions s
       JOIN floor_plans fp ON s.floor_plan_id = fp.id
       WHERE fp.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete AI Suggestion
app.delete('/api/ai-suggestions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query(
      `SELECT s.id FROM ai_suggestions s
       JOIN floor_plans fp ON s.floor_plan_id = fp.id
       WHERE s.id = $1 AND fp.user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    await pool.query('DELETE FROM ai_suggestions WHERE id = $1', [id]);
    res.json({ message: 'Suggestion deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI Materials
app.get('/api/ai-materials', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, fp.name as floor_plan_name
       FROM ai_materials m
       JOIN floor_plans fp ON m.floor_plan_id = fp.id
       WHERE fp.user_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete AI Material
app.delete('/api/ai-materials/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query(
      `SELECT m.id FROM ai_materials m
       JOIN floor_plans fp ON m.floor_plan_id = fp.id
       WHERE m.id = $1 AND fp.user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }
    await pool.query('DELETE FROM ai_materials WHERE id = $1', [id]);
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AI ROOM DETECTOR ROUTES ============

app.post('/api/ai/detect-rooms', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { floor_plan_id } = req.body;
    let imageBase64 = req.body.image_data;

    if (req.file) {
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // Convert to PNG and resize for AI vision API compatibility
    imageBase64 = await ensurePngDataUrl(imageBase64);

    const result = await openrouterService.detectRooms(imageBase64);

    // Auto-create a floor plan entry if user uploaded an image without selecting one
    let effectiveFloorPlanId = floor_plan_id;
    if (result.success && !effectiveFloorPlanId && imageBase64) {
      const fpResult = await pool.query(
        `INSERT INTO floor_plans (user_id, name, image_data, status) VALUES ($1, $2, $3, 'analyzed') RETURNING id`,
        [req.user.id, `Room Detection - ${new Date().toLocaleDateString()}`, imageBase64]
      );
      effectiveFloorPlanId = fpResult.rows[0].id;
    }

    if (result.success) {
      // Parse JSON from response
      let parsedData = null;
      try {
        const codeBlockMatch = result.analysis.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          parsedData = JSON.parse(codeBlockMatch[1]);
        }
      } catch (e) {
        console.log('Could not parse room detection JSON:', e.message);
      }

      await pool.query(
        `INSERT INTO room_detections (floor_plan_id, detected_rooms, total_rooms, confidence_score, full_result, model_used)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          effectiveFloorPlanId || null,
          JSON.stringify(parsedData?.detected_rooms || []),
          parsedData?.total_rooms || 0,
          parsedData?.confidence_score || null,
          result.analysis,
          result.model
        ]
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/room-detections', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rd.*, fp.name as floor_plan_name
       FROM room_detections rd
       LEFT JOIN floor_plans fp ON rd.floor_plan_id = fp.id
       WHERE fp.user_id = $1 OR rd.floor_plan_id IS NULL
       ORDER BY rd.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/room-detections/:id', authenticateToken, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT rd.id FROM room_detections rd
       JOIN floor_plans fp ON rd.floor_plan_id = fp.id
       WHERE rd.id = $1 AND fp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    await pool.query('DELETE FROM room_detections WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AI HOME STAGING ROUTES ============

app.post('/api/ai/home-staging', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id, room_id, target_buyer } = req.body;

    let roomData = { name: 'Living Space', room_type: 'living', area: 300 };

    if (room_id) {
      const roomResult = await pool.query(
        `SELECT r.* FROM rooms r
         JOIN floor_plans fp ON r.floor_plan_id = fp.id
         WHERE r.id = $1 AND fp.user_id = $2`,
        [room_id, req.user.id]
      );
      if (roomResult.rows.length > 0) {
        roomData = roomResult.rows[0];
      }
    }

    const result = await openrouterService.getHomeStagingAdvice(roomData, target_buyer || 'general');

    if (result.success && floor_plan_id) {
      let parsedData = null;
      try {
        const codeBlockMatch = result.analysis.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          parsedData = JSON.parse(codeBlockMatch[1]);
        }
      } catch (e) {
        console.log('Could not parse staging JSON:', e.message);
      }

      await pool.query(
        `INSERT INTO home_staging (floor_plan_id, room_id, staging_style, recommendations, target_buyer, estimated_value_increase, full_result, model_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          floor_plan_id,
          room_id || null,
          parsedData?.staging_style || 'Modern',
          JSON.stringify(parsedData?.recommendations || []),
          parsedData?.target_buyer || target_buyer || 'general',
          parsedData?.estimated_value_increase || null,
          result.analysis,
          result.model
        ]
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/home-staging', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT hs.*, fp.name as floor_plan_name, r.name as room_name
       FROM home_staging hs
       JOIN floor_plans fp ON hs.floor_plan_id = fp.id
       LEFT JOIN rooms r ON hs.room_id = r.id
       WHERE fp.user_id = $1
       ORDER BY hs.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/home-staging/:id', authenticateToken, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT hs.id FROM home_staging hs
       JOIN floor_plans fp ON hs.floor_plan_id = fp.id
       WHERE hs.id = $1 AND fp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    await pool.query('DELETE FROM home_staging WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AI FURNITURE PLACER ROUTES ============

app.post('/api/ai/furniture-placement', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id, room_id, style } = req.body;

    let roomData = { name: 'Living Room', room_type: 'living', width: 15, length: 20, area: 300 };

    if (room_id) {
      const roomResult = await pool.query(
        `SELECT r.* FROM rooms r
         JOIN floor_plans fp ON r.floor_plan_id = fp.id
         WHERE r.id = $1 AND fp.user_id = $2`,
        [room_id, req.user.id]
      );
      if (roomResult.rows.length > 0) {
        roomData = roomResult.rows[0];
      }
    }

    const result = await openrouterService.placeFurniture(roomData, style || 'modern');

    if (result.success && floor_plan_id) {
      let parsedData = null;
      try {
        const codeBlockMatch = result.analysis.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          parsedData = JSON.parse(codeBlockMatch[1]);
        }
      } catch (e) {
        console.log('Could not parse furniture JSON:', e.message);
      }

      await pool.query(
        `INSERT INTO furniture_placements (floor_plan_id, room_id, furniture_items, layout_score, traffic_flow_rating, full_result, model_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          floor_plan_id,
          room_id || null,
          JSON.stringify(parsedData?.furniture_items || []),
          parsedData?.layout_score || null,
          parsedData?.traffic_flow_rating || 'good',
          result.analysis,
          result.model
        ]
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/furniture-placements', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fp_data.*, fp.name as floor_plan_name, r.name as room_name
       FROM furniture_placements fp_data
       JOIN floor_plans fp ON fp_data.floor_plan_id = fp.id
       LEFT JOIN rooms r ON fp_data.room_id = r.id
       WHERE fp.user_id = $1
       ORDER BY fp_data.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/furniture-placements/:id', authenticateToken, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT fp_data.id FROM furniture_placements fp_data
       JOIN floor_plans fp ON fp_data.floor_plan_id = fp.id
       WHERE fp_data.id = $1 AND fp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    await pool.query('DELETE FROM furniture_placements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AI MAINTENANCE PREDICTOR ROUTES ============

app.post('/api/ai/maintenance-prediction', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id, home_age } = req.body;

    const fpResult = await pool.query(
      'SELECT * FROM floor_plans WHERE id = $1 AND user_id = $2',
      [floor_plan_id, req.user.id]
    );

    if (fpResult.rows.length === 0) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }

    const roomsResult = await pool.query(
      'SELECT * FROM rooms WHERE floor_plan_id = $1',
      [floor_plan_id]
    );

    const floorPlanData = {
      ...fpResult.rows[0],
      rooms: roomsResult.rows
    };

    const result = await openrouterService.predictMaintenance(floorPlanData, home_age || 10);

    if (result.success) {
      let parsedData = null;
      try {
        const codeBlockMatch = result.analysis.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          parsedData = JSON.parse(codeBlockMatch[1]);
        }
      } catch (e) {
        console.log('Could not parse maintenance JSON:', e.message);
      }

      await pool.query(
        `INSERT INTO maintenance_predictions (floor_plan_id, predictions, total_annual_cost, priority_items, next_maintenance_date, full_result, model_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          floor_plan_id,
          JSON.stringify(parsedData?.predictions || []),
          parsedData?.total_annual_cost || null,
          parsedData?.priority_items || 0,
          parsedData?.next_maintenance_date || null,
          result.analysis,
          result.model
        ]
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/maintenance-predictions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mp.*, fp.name as floor_plan_name
       FROM maintenance_predictions mp
       JOIN floor_plans fp ON mp.floor_plan_id = fp.id
       WHERE fp.user_id = $1
       ORDER BY mp.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/maintenance-predictions/:id', authenticateToken, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT mp.id FROM maintenance_predictions mp
       JOIN floor_plans fp ON mp.floor_plan_id = fp.id
       WHERE mp.id = $1 AND fp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    await pool.query('DELETE FROM maintenance_predictions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AI ENERGY EFFICIENCY ROUTES ============

app.post('/api/ai/energy-audit', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id, climate_zone } = req.body;

    const fpResult = await pool.query(
      'SELECT * FROM floor_plans WHERE id = $1 AND user_id = $2',
      [floor_plan_id, req.user.id]
    );

    if (fpResult.rows.length === 0) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }

    const roomsResult = await pool.query(
      'SELECT * FROM rooms WHERE floor_plan_id = $1',
      [floor_plan_id]
    );

    const floorPlanData = {
      ...fpResult.rows[0],
      rooms: roomsResult.rows
    };

    const result = await openrouterService.auditEnergyEfficiency(floorPlanData, climate_zone || 'temperate');

    if (result.success) {
      let parsedData = null;
      try {
        const codeBlockMatch = result.analysis.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          parsedData = JSON.parse(codeBlockMatch[1]);
        }
      } catch (e) {
        console.log('Could not parse energy audit JSON:', e.message);
      }

      await pool.query(
        `INSERT INTO energy_audits (floor_plan_id, efficiency_score, annual_cost_estimate, potential_savings, recommendations, carbon_footprint, full_result, model_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          floor_plan_id,
          parsedData?.efficiency_score || null,
          parsedData?.annual_cost_estimate || null,
          parsedData?.potential_savings || null,
          JSON.stringify(parsedData?.recommendations || []),
          parsedData?.carbon_footprint || null,
          result.analysis,
          result.model
        ]
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/energy-audits', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ea.*, fp.name as floor_plan_name
       FROM energy_audits ea
       JOIN floor_plans fp ON ea.floor_plan_id = fp.id
       WHERE fp.user_id = $1
       ORDER BY ea.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/energy-audits/:id', authenticateToken, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT ea.id FROM energy_audits ea
       JOIN floor_plans fp ON ea.floor_plan_id = fp.id
       WHERE ea.id = $1 AND fp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    await pool.query('DELETE FROM energy_audits WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AI HOME INSPECTION ROUTES ============

app.post('/api/ai/home-inspection', authenticateToken, async (req, res) => {
  try {
    const { floor_plan_id, inspection_type } = req.body;

    const fpResult = await pool.query(
      'SELECT * FROM floor_plans WHERE id = $1 AND user_id = $2',
      [floor_plan_id, req.user.id]
    );

    if (fpResult.rows.length === 0) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }

    const roomsResult = await pool.query(
      'SELECT * FROM rooms WHERE floor_plan_id = $1',
      [floor_plan_id]
    );

    const floorPlanData = {
      ...fpResult.rows[0],
      rooms: roomsResult.rows
    };

    const result = await openrouterService.generateHomeInspection(floorPlanData, inspection_type || 'general');

    if (result.success) {
      let parsedData = null;
      try {
        const codeBlockMatch = result.analysis.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          parsedData = JSON.parse(codeBlockMatch[1]);
        }
      } catch (e) {
        console.log('Could not parse inspection JSON:', e.message);
      }

      await pool.query(
        `INSERT INTO home_inspections (floor_plan_id, inspection_type, overall_condition, issues_found, critical_issues, estimated_repair_cost, full_result, model_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          floor_plan_id,
          parsedData?.inspection_type || inspection_type || 'general',
          parsedData?.overall_condition || 'Good',
          JSON.stringify(parsedData?.issues_found || []),
          parsedData?.critical_issues || 0,
          parsedData?.estimated_repair_cost || null,
          result.analysis,
          result.model
        ]
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/home-inspections', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT hi.*, fp.name as floor_plan_name
       FROM home_inspections hi
       JOIN floor_plans fp ON hi.floor_plan_id = fp.id
       WHERE fp.user_id = $1
       ORDER BY hi.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/home-inspections/:id', authenticateToken, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT hi.id FROM home_inspections hi
       JOIN floor_plans fp ON hi.floor_plan_id = fp.id
       WHERE hi.id = $1 AND fp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    await pool.query('DELETE FROM home_inspections WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD STATS ============

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) FROM floor_plans WHERE user_id = $1', [req.user.id]),
      pool.query(`SELECT COUNT(*) FROM rooms r JOIN floor_plans fp ON r.floor_plan_id = fp.id WHERE fp.user_id = $1`, [req.user.id]),
      pool.query(`SELECT COUNT(*) FROM renovation_suggestions rs JOIN floor_plans fp ON rs.floor_plan_id = fp.id WHERE fp.user_id = $1`, [req.user.id]),
      pool.query(`SELECT COALESCE(SUM(total_cost), 0) FROM project_estimates pe JOIN floor_plans fp ON pe.floor_plan_id = fp.id WHERE fp.user_id = $1`, [req.user.id]),
      pool.query(`SELECT COUNT(*) FROM ai_analysis aa JOIN floor_plans fp ON aa.floor_plan_id = fp.id WHERE fp.user_id = $1`, [req.user.id]),
    ]);

    res.json({
      floorPlans: parseInt(stats[0].rows[0].count),
      rooms: parseInt(stats[1].rows[0].count),
      suggestions: parseInt(stats[2].rows[0].count),
      totalEstimate: parseFloat(stats[3].rows[0].coalesce),
      aiAnalyses: parseInt(stats[4].rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ BULK OPERATIONS ============

// Bulk delete for any resource
app.post('/api/bulk/delete', authenticateToken, async (req, res) => {
  try {
    const { resource, ids } = req.body;
    if (!resource || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'resource and ids[] are required' });
    }

    const allowedResources = {
      'floor-plans': { table: 'floor_plans', ownerCheck: 'user_id = $USER_ID' },
      'rooms': { table: 'rooms', joinCheck: 'id IN (SELECT r.id FROM rooms r JOIN floor_plans fp ON r.floor_plan_id = fp.id WHERE fp.user_id = $USER_ID AND r.id = ANY($IDS))' },
      'suggestions': { table: 'renovation_suggestions', joinCheck: 'id IN (SELECT rs.id FROM renovation_suggestions rs JOIN floor_plans fp ON rs.floor_plan_id = fp.id WHERE fp.user_id = $USER_ID AND rs.id = ANY($IDS))' },
      'materials': { table: 'materials', noOwner: true },
      'estimates': { table: 'project_estimates', joinCheck: 'id IN (SELECT pe.id FROM project_estimates pe JOIN floor_plans fp ON pe.floor_plan_id = fp.id WHERE fp.user_id = $USER_ID AND pe.id = ANY($IDS))' },
      'templates': { table: 'design_templates', noOwner: true },
      'contractors': { table: 'contractors', noOwner: true },
    };

    const config = allowedResources[resource];
    if (!config) {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    let result;
    if (config.noOwner) {
      result = await pool.query(`DELETE FROM ${config.table} WHERE id = ANY($1) RETURNING id`, [ids]);
    } else if (config.ownerCheck) {
      result = await pool.query(`DELETE FROM ${config.table} WHERE id = ANY($1) AND user_id = $2 RETURNING id`, [ids, req.user.id]);
    } else {
      result = await pool.query(`DELETE FROM ${config.table} WHERE ${config.joinCheck.replace('$USER_ID', '$2').replace('$IDS', '$1')} RETURNING id`, [ids, req.user.id]);
    }

    res.json({ message: `Deleted ${result.rowCount} items`, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update for any resource
app.post('/api/bulk/update', authenticateToken, async (req, res) => {
  try {
    const { resource, ids, updates } = req.body;
    if (!resource || !Array.isArray(ids) || ids.length === 0 || !updates) {
      return res.status(400).json({ error: 'resource, ids[], and updates are required' });
    }

    const allowedUpdates = {
      'floor-plans': ['status'],
      'suggestions': ['status', 'priority', 'category'],
      'materials': ['in_stock', 'category'],
      'estimates': ['status'],
      'contractors': ['availability', 'verified'],
    };

    const allowed = allowedUpdates[resource];
    if (!allowed) {
      return res.status(400).json({ error: 'Bulk update not supported for this resource' });
    }

    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key)) {
        setClauses.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const tableMap = {
      'floor-plans': 'floor_plans',
      'suggestions': 'renovation_suggestions',
      'materials': 'materials',
      'estimates': 'project_estimates',
      'contractors': 'contractors',
    };

    values.push(ids);
    const query = `UPDATE ${tableMap[resource]} SET ${setClauses.join(', ')} WHERE id = ANY($${paramIdx}) RETURNING id`;
    const result = await pool.query(query, values);

    res.json({ message: `Updated ${result.rowCount} items`, updated: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ GLOBAL ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
