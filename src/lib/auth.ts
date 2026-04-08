import { dbHelpers } from './database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, AuthResponse } from '@/types/database';
import { dbRun, dbGet } from '@/lib/database';
import { NextRequest } from 'next/server';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // IMPORTANT: do not throw at module import time; throw only when auth is actually used.
      throw new Error('CRITICAL: JWT_SECRET environment variable is required in production');
    }
    console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET env var for production!');
    return 'uniact-dev-only-key-change-for-production';
  }
  return secret;
}

export async function registerUser(userData: {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'teacher' | 'student';
  class_id?: number;
}): Promise<AuthResponse> {
  const { email, password, name, role = 'student', class_id } = userData;

  // Kiểm tra email đã tồn tại
  const existingUser = (await dbHelpers.getUserByEmail(email)) as User | undefined;
  if (existingUser) {
    throw new Error('Email đã tồn tại trong hệ thống');
  }

  // Mã hóa mật khẩu
  const passwordHash = await bcrypt.hash(password, 12);

  // Lưu user vào database và nhận kết quả có lastID
  const result = await dbHelpers.createUser({
    email,
    name,
    role,
    password_hash: passwordHash,
    class_id,
  });

  // 🔥 SỬA LỖI Ở ĐÂY: Kiểm tra lastID có tồn tại không
  if (!result.lastID) {
    throw new Error('Không thể lấy ID của user mới tạo');
  }

  // Lấy thông tin user vừa tạo bằng lastID
  const user = (await dbHelpers.getUserById(result.lastID)) as User;
  if (!user) {
    throw new Error('Lỗi khi tạo người dùng');
  }

  // Tạo JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

  return { user, token };
}

// 🆕 THÊM device-based authentication
export async function loginUser(credentials: {
  email: string;
  password: string;
  device_id?: string;
  mac_address?: string;
}): Promise<AuthResponse> {
  const { email, password, device_id, mac_address } = credentials;

  // Tìm user bằng email
  const user = (await dbHelpers.getUserByEmail(email)) as User;
  if (!user) {
    throw new Error('Email hoặc mật khẩu không đúng');
  }

  // Nếu tài khoản bị vô hiệu hóa thì chặn đăng nhập
  // (tương thích ngược: nếu DB cũ chưa có cột is_active hoặc null thì coi như active)
  if ((user as any).is_active === 0) {
    throw new Error('Tài khoản đã bị vô hiệu hóa');
  }

  // Kiểm tra mật khẩu
  const isValid = await bcrypt.compare(password, user.password_hash!);
  if (!isValid) {
    throw new Error('Email hoặc mật khẩu không đúng');
  }

  // 🆕 KIỂM TRA DEVICE (nếu có thông tin device)
  if (device_id && mac_address) {
    const device = await dbHelpers.getDeviceByMacAddress(mac_address);
    if (!device || device.user_id !== user.id || !device.approved) {
      throw new Error('Thiết bị chưa được đăng ký hoặc chưa được phê duyệt');
    }

    // Cập nhật last_seen
    await dbHelpers.updateDeviceLastSeen(device.id);
  }

  // Tạo JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      device_id: device_id, // 🆕 THÊM device_id vào token
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

  // Trả về user (không bao gồm password_hash)
  const { password_hash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

// 🆕 THÊM hàm quản lý device
export const deviceManager = {
  registerDevice: async (user_id: number, mac_address: string, device_name: string) => {
    const result = await dbRun(
      'INSERT INTO devices (user_id, mac_address, device_name) VALUES (?, ?, ?)',
      [user_id, mac_address, device_name]
    );
    return result;
  },

  approveDevice: async (device_id: number, approved_by: number) => {
    await dbRun('UPDATE devices SET approved = 1, approved_by = ? WHERE id = ?', [
      approved_by,
      device_id,
    ]);
  },

  getDeviceByMacAddress: async (mac_address: string) => {
    return await dbGet('SELECT * FROM devices WHERE mac_address = ?', [mac_address]);
  },
};

export function verifyToken(token: string): { userId: number; email: string; role: string } {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: number; email: string; role: string };
  } catch (error) {
    throw new Error('Token không hợp lệ');
  }
}

export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    const decoded = verifyToken(token);

    // Check if userId exists in decoded token (security fix)
    if (!decoded?.userId || typeof decoded.userId !== 'number') {
      console.warn('⚠️  Invalid token: missing or invalid userId');
      return null;
    }

    // Lấy user từ database
    const user = (await dbHelpers.getUserById(decoded.userId)) as User | undefined;

    if (!user) return null;

    // Chặn user đã bị vô hiệu hóa (is_active = 0)
    if ((user as any).is_active === 0) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Get user from token error:', error);
    return null;
  }
}

export async function getUserFromSession(_request?: NextRequest): Promise<User | null> {
  try {
    // Lấy token từ cookies hoặc Authorization Bearer (hỗ trợ script/tests)
    const { cookies, headers } = await import('next/headers');
    const cookieStore = await cookies();
    const hdrs = await headers();

    const cookieToken = cookieStore.get('token')?.value;
    const authHeader = hdrs.get('authorization') || hdrs.get('Authorization');
    const bearerToken =
      authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : undefined;

    const token = cookieToken || bearerToken;

    if (!token) {
      return null;
    }

    return await getUserFromToken(token);
  } catch (error) {
    console.error('Get user from session error:', error);
    return null;
  }
}
