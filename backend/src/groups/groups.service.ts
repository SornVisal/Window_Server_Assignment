import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

export interface GroupRow {
  id: string;
  name: string;
  leaderName: string | null;
  createdAt: string;
}

@Injectable()
export class GroupsService {
  constructor(private readonly database: DatabaseService) {}

  private readonly baseSelect =
    'select id, name, leader_name as "leaderName", created_at as "createdAt" from groups';

  async create(dto: CreateGroupDto): Promise<GroupRow> {
    const rows = await this.database.query<GroupRow>(
      `with inserted as (
        insert into groups (name, leader_name)
        values ($1, $2)
        returning *
      )
      select id, name, leader_name as "leaderName", created_at as "createdAt" from inserted`,
      [dto.name, dto.leaderName ?? null],
    );
    return rows[0];
  }

  async findAll(): Promise<GroupRow[]> {
    return this.database.query<GroupRow>(
      `${this.baseSelect} order by created_at desc`,
    );
  }

  async findOne(id: string): Promise<GroupRow | null> {
    const rows = await this.database.query<GroupRow>(
      `${this.baseSelect} where id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async update(id: string, dto: UpdateGroupDto): Promise<GroupRow | null> {
    const rows = await this.database.query<GroupRow>(
      `with updated as (
        update groups
        set
          name = coalesce($1, name),
          leader_name = coalesce($2, leader_name)
        where id = $3
        returning *
      )
      select id, name, leader_name as "leaderName", created_at as "createdAt" from updated`,
      [dto.name ?? null, dto.leaderName ?? null, id],
    );
    return rows[0] ?? null;
  }

  async remove(id: string): Promise<GroupRow | null> {
    const rows = await this.database.query<GroupRow>(
      `with deleted as (
        delete from groups where id = $1 returning *
      )
      select id, name, leader_name as "leaderName", created_at as "createdAt" from deleted`,
      [id],
    );
    return rows[0] ?? null;
  }
}
