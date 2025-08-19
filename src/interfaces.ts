import type { Response } from 'express';

export interface MyResponse extends Response {
  rows?: object[];
  password?: string;
  pwd?: string;
  pwdHash?: string;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      isProtected?: boolean;
      decodedAccessToken?: any;
      decodedRefreshToken?: any;
    }
  }
}