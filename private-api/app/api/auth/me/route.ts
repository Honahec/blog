import { NextRequest } from 'next/server';
import { isAdminUser } from '../../../../lib/authz';
import { getSession, jsonResponse, optionsResponse } from '../../../../lib/http';

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export function GET(req: NextRequest) {
  const user = getSession(req);
  return jsonResponse(
    req,
    user ? { user: { ...user, admin: isAdminUser(user) } } : { message: '未登录' },
    user ? 200 : 401,
  );
}
