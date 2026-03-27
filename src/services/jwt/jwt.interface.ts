import * as jwt from 'jsonwebtoken';

export interface JWTPayload {
    uid: string;
    email?: string;
    name?: string;
    roles: string[];
    [key: string]: any;
}

export interface JWTVerifyOptions {
    algorithms?: jwt.Algorithm[];
}

export interface JWTSignOptions extends jwt.SignOptions {}