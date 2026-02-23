import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadSubmissionDto {
  @IsUUID()
  groupId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  uploadedBy?: string;
}
