import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateSubmissionDto {
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsUUID()
  uploadedBy?: string;

  @IsOptional()
  @IsDateString()
  submittedAt?: string;
}
