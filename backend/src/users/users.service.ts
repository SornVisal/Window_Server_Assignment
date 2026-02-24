import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  groupId: string | null;
  isApproved: boolean;
  createdAt: string;
}

export interface UserWithPasswordRow extends UserRow {
  passwordHash: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  private readonly baseSelect =
    'select id, email, name, role, group_id as "groupId", is_approved as "isApproved", created_at as "createdAt" from users';
  private readonly baseSelectWithPassword =
    'select id, email, name, role, group_id as "groupId", is_approved as "isApproved", created_at as "createdAt", password_hash as "passwordHash" from users';

  async create(dto: CreateUserDto): Promise<UserRow> {
    const rows = await this.database.query<UserRow>(
      `with inserted as (
        insert into users (email, name, role)
        values (LOWER($1), $2, $3)
        returning *
      )
      select id, email, name, role, group_id as "groupId", is_approved as "isApproved", created_at as "createdAt" from inserted`,
      [dto.email, dto.name, dto.role ?? 'member'],
    );
    return rows[0];
  }

  async createWithPassword(
    dto: CreateUserDto,
    passwordHash: string,
    groupId?: string,
  ): Promise<UserRow> {
    const rows = await this.database.query<UserRow>(
      `with inserted as (
        insert into users (email, name, role, password_hash, group_id, is_approved)
        values (LOWER($1), $2, $3, $4, $5, $6)
        returning *
      )
      select id, email, name, role, group_id as "groupId", is_approved as "isApproved", created_at as "createdAt" from inserted`,
      [dto.email, dto.name, dto.role ?? 'member', passwordHash, groupId ?? null, false],
    );
    return rows[0];
  }

  async findAll(): Promise<UserRow[]> {
    return this.database.query<UserRow>(
      `${this.baseSelect} order by created_at desc`,
    );
  }

  async findOne(id: string): Promise<UserRow | null> {
    const rows = await this.database.query<UserRow>(
      `${this.baseSelect} where id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await this.database.query<UserRow>(
      `${this.baseSelect} where LOWER(email) = LOWER($1)`,
      [email],
    );
    return rows[0] ?? null;
  }

  async findByEmailWithPassword(
    email: string,
  ): Promise<UserWithPasswordRow | null> {
    const rows = await this.database.query<UserWithPasswordRow>(
      `${this.baseSelectWithPassword} where LOWER(email) = LOWER($1)`,
      [email],
    );
    return rows[0] ?? null;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserRow | null> {
    const rows = await this.database.query<UserRow>(
      `with updated as (
        update users
        set
          email = coalesce(LOWER($1), email),
          name = coalesce($2, name),
          role = coalesce($3, role),
          group_id = coalesce($4, group_id)
        where id = $5
        returning *
      )
      select id, email, name, role, group_id as "groupId", is_approved as "isApproved", created_at as "createdAt" from updated`,
      [dto.email ?? null, dto.name ?? null, dto.role ?? null, dto.groupId ?? null, id],
    );
    return rows[0] ?? null;
  }

  async remove(id: string): Promise<UserRow | null> {
    const rows = await this.database.query<UserRow>(
      `with deleted as (
        delete from users where id = $1 returning *
      )
      select id, email, name, role, group_id as "groupId", is_approved as "isApproved", created_at as "createdAt" from deleted`,
      [id],
    );
    return rows[0] ?? null;
  }

  async updateRole(id: string, role: string, groupId?: string): Promise<UserRow | null> {
    const rows = await this.database.query<UserRow>(
      `with updated as (
        update users
        set
          role = $1,
          group_id = coalesce($2, group_id)
        where id = $3
        returning *
      )
      select id, email, name, role, group_id as "groupId", is_approved as "isApproved", created_at as "createdAt" from updated`,
      [role, groupId ?? null, id],
    );
    return rows[0] ?? null;
  }

  async approveUser(id: string): Promise<UserRow | null> {
    const rows = await this.database.query<UserRow>(
      `with updated as (
        update users
        set is_approved = true
        where id = $1
        returning *
      )
      select id, email, name, role, group_id as "groupId", is_approved as "isApproved", created_at as "createdAt" from updated`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findPendingByGroup(groupId: string): Promise<UserRow[]> {
    return this.database.query<UserRow>(
      `${this.baseSelect} where group_id = $1 and is_approved = false`,
      [groupId],
    );
  }

  async findLeaderByGroup(groupId: string): Promise<UserRow | null> {
    const rows = await this.database.query<UserRow>(
      `${this.baseSelect} where group_id = $1 and role = 'leader'`,
      [groupId],
    );
    return rows[0] ?? null;
  }

  async findByGroupId(groupId: string): Promise<UserRow[]> {
    return this.database.query<UserRow>(
      `${this.baseSelect} where group_id = $1 order by created_at desc`,
      [groupId],
    );
  }

  async countApprovedMembersByGroup(groupId: string): Promise<number> {
    const rows = await this.database.query<{ count: string }>(
      `select count(*) as count from users where group_id = $1 and is_approved = true`,
      [groupId],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }
}
