import authService from '../services/authService.js';
import { getUserActivity } from '../services/activityService.js';
import { registerSchema, loginSchema, updateSettingsSchema } from '../utils/validators.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { user, token } = await authService.registerUser(validatedData);

    res.cookie('pipeline_token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      user,
      token,
      message: 'Account registered successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { user, token } = await authService.loginUser(validatedData);

    res.cookie('pipeline_token', token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      user,
      token,
      message: 'Logged in successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  res.clearCookie('pipeline_token', COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const validated = updateSettingsSchema.parse(req.body);
    const updated = await authService.updateUserSettings(req.userId, validated);
    res.status(200).json({
      success: true,
      settings: updated,
      message: 'Settings updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const activities = await getUserActivity(req.userId, limit);
    res.status(200).json({
      success: true,
      activities,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  register,
  login,
  logout,
  getMe,
  updateSettings,
  getActivity,
};
