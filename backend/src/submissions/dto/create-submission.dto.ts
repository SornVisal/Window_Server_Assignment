import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSubmissionDto {
  @IsUUID()
  groupId: string;

  @IsString()
  title: string;

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
