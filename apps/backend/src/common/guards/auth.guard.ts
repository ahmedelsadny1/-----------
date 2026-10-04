import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        'dev-only-change-in-production-64-chars-long-secret-key-here!!!!!';
      const payload = await this.jwtService.verifyAsync(token, { secret });

      // Attach user payload to request
      request.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }
}
