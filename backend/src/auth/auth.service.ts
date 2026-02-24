import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRow, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthResponse {
  user: UserRow;
  accessToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    this.logger.debug(`Register attempt for email: ${dto.email}`);
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      this.logger.warn(`Email already exists: ${dto.email}`);
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    this.logger.debug(`Password hashed for new user: ${dto.email}`);
    
    const user: UserRow = await this.usersService.createWithPassword(
      { email: dto.email, name: dto.name },
      passwordHash,
      dto.groupId,
    );

    this.logger.debug(`User created successfully: ${user.id}`);

    return {
      user,
      accessToken: await this.signToken(user.id, user.email, user.role, user.groupId ?? undefined),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    this.logger.debug(`Login attempt for email: ${dto.email}`);
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    
    if (!user) {
      this.logger.warn(`Login failed: user not found or invalid credentials - ${dto.email}`);
      // Generic error message - don't reveal if email exists
      throw new UnauthorizedException('Invalid email or password. Please check and try again.');
    }

    if (!user.passwordHash) {
      this.logger.warn(`Login failed: no password hash for user - ${dto.email}`);
      throw new UnauthorizedException('Invalid email or password. Please check and try again.');
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      this.logger.warn(`Login failed: password mismatch for user - ${dto.email}`);
      // Generic error message - don't reveal if password is wrong
      throw new UnauthorizedException('Invalid email or password. Please check and try again.');
    }

    this.logger.debug(`Login successful for user: ${dto.email}`);

    const safeUser: UserRow = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      groupId: user.groupId,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
    };

    return {
      user: safeUser,
      accessToken: await this.signToken(user.id, user.email, user.role, user.groupId ?? undefined),
    };
  }

  private async signToken(
    id: string,
    email: string,
    role: string,
    groupId?: string,
  ): Promise<string> {
    return this.jwtService.signAsync({ sub: id, email, role, groupId });
  }
}
