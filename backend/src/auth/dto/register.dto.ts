import { IsEmail, IsString, MinLength, IsUUID, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;
}
