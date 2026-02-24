import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class UpdateRoleDto {
  @IsIn(['owner', 'admin', 'leader', 'member'])
  role: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;
}
