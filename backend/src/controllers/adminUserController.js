const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ADMIN_ROLES } = require('../utils/constants');

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await AdminUser.find().sort({ createdAt: 1 });
  res.json({ success: true, data: { users: users.map((u) => u.toSafeJSON()) } });
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await AdminUser.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw ApiError.conflict('An admin with this email already exists');
  const user = new AdminUser({ name, email, role });
  await user.setPassword(password);
  await user.save();
  res.status(201).json({ success: true, data: { user: user.toSafeJSON() } });
});

exports.updateUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('User not found');
  const user = await AdminUser.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const isSelf = String(user._id) === String(req.admin._id);
  const { name, role, isActive, password } = req.body;

  if (isSelf && role !== undefined && role !== user.role) throw ApiError.badRequest('You cannot change your own role');
  if (isSelf && isActive === false) throw ApiError.badRequest('You cannot deactivate your own account');

  // Never leave the system without an active Super Admin.
  const losingSuperAdmin =
    user.role === 'SUPER_ADMIN' && user.isActive && ((role && role !== 'SUPER_ADMIN') || isActive === false);
  if (losingSuperAdmin) {
    const others = await AdminUser.countDocuments({ _id: { $ne: user._id }, role: 'SUPER_ADMIN', isActive: true });
    if (others === 0) throw ApiError.badRequest('There must be at least one active Super Admin');
  }

  if (name !== undefined) user.name = String(name).trim();
  if (role !== undefined) {
    if (!ADMIN_ROLES.includes(role)) throw ApiError.badRequest('Invalid role');
    user.role = role;
  }
  if (isActive !== undefined) user.isActive = Boolean(isActive);
  if (password) await user.setPassword(password);

  await user.save();
  res.json({ success: true, data: { user: user.toSafeJSON() } });
});
