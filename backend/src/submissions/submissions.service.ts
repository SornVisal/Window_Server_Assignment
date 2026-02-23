import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

export interface SubmissionRow {
  id: string;
  groupId: string;
  title: string;
  fileUrl: string | null;
  submittedAt: string;
  uploadedBy: string | null;
}

@Injectable()
export class SubmissionsService {
  constructor(private readonly database: DatabaseService) {}

  private readonly baseSelect =
    'select id, group_id as "groupId", title, file_url as "fileUrl", submitted_at as "submittedAt", uploaded_by as "uploadedBy" from submissions';

  async create(dto: CreateSubmissionDto): Promise<SubmissionRow> {
    const rows = await this.database.query<SubmissionRow>(
      `with inserted as (
        insert into submissions (group_id, title, file_url, submitted_at, uploaded_by)
        values ($1, $2, $3, coalesce($4, now()), $5)
        returning *
      )
      select id, group_id as "groupId", title, file_url as "fileUrl", submitted_at as "submittedAt", uploaded_by as "uploadedBy" from inserted`,
      [
        dto.groupId,
        dto.title,
        dto.fileUrl ?? null,
        dto.submittedAt ?? null,
        dto.uploadedBy ?? null,
      ],
    );
    return rows[0];
  }

  async findAll(): Promise<SubmissionRow[]> {
    return this.database.query<SubmissionRow>(
      `${this.baseSelect} order by submitted_at desc`,
    );
  }

  async findOne(id: string): Promise<SubmissionRow | null> {
    const rows = await this.database.query<SubmissionRow>(
      `${this.baseSelect} where id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByGroupId(groupId: string): Promise<SubmissionRow[]> {
    return this.database.query<SubmissionRow>(
      `${this.baseSelect} where group_id = $1 order by submitted_at desc`,
      [groupId],
    );
  }

  async findByUserId(userId: string): Promise<SubmissionRow[]> {
    return this.database.query<SubmissionRow>(
      `${this.baseSelect} where uploaded_by = $1 order by submitted_at desc`,
      [userId],
    );
  }

  async update(
    id: string,
    dto: UpdateSubmissionDto,
  ): Promise<SubmissionRow | null> {
    const rows = await this.database.query<SubmissionRow>(
      `with updated as (
        update submissions
        set
          group_id = coalesce($1, group_id),
          title = coalesce($2, title),
          file_url = coalesce($3, file_url),
          submitted_at = coalesce($4, submitted_at),
          uploaded_by = coalesce($5, uploaded_by)
        where id = $6
        returning *
      )
      select id, group_id as "groupId", title, file_url as "fileUrl", submitted_at as "submittedAt", uploaded_by as "uploadedBy" from updated`,
      [
        dto.groupId ?? null,
        dto.title ?? null,
        dto.fileUrl ?? null,
        dto.submittedAt ?? null,
        dto.uploadedBy ?? null,
        id,
      ],
    );
    return rows[0] ?? null;
  }

  async remove(id: string): Promise<SubmissionRow | null> {
    const rows = await this.database.query<SubmissionRow>(
      `with deleted as (
        delete from submissions where id = $1 returning *
      )
      select id, group_id as "groupId", title, file_url as "fileUrl", submitted_at as "submittedAt", uploaded_by as "uploadedBy" from deleted`,
      [id],
    );
    return rows[0] ?? null;
  }
}
