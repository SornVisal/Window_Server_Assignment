import { IsIn } from 'class-validator';

export class UpdateRoleDto {
  @IsIn(['owner', 'admin', 'leader', 'member'])
  role: string;
}
