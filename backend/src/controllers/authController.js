const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const sb     = require('../config/supabase');

const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password are required.' });

  try {
    const { data: user, error } = await sb
      .from('users')
      .select('id, username, password_hash, full_name, role')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (error || !user)
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const { data: user, error } = await sb
      .from('users')
      .select('id, username, full_name, role, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, user });
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { login, getProfile };
