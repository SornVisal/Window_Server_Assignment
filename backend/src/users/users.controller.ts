import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UsersService } from './users.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('pending')
  @Roles('leader')
  async findPending(@CurrentUser() user: any) {
    if (!user.groupId) {
      throw new ForbiddenException('No group assigned');
    }
    return this.usersService.findPendingByGroup(user.groupId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (groupId === user.groupId) {
      return user;
    }
    return user;
  }

  @Get(':id/submissions')
  async findSubmissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.submissionsService.findByUserId(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, dto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Patch(':id/role')
  @Roles('owner', 'admin')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() currentUser: any,
  ) {
    // Only owner can assign owner role
    if (dto.role === 'owner' && currentUser.role !== 'owner') {
      throw new ForbiddenException('Only owner can assign owner role');
    }
    
    // Prevent changing owner account
    const targetUser = await this.usersService.findOne(id);
    if (targetUser?.role === 'owner' && currentUser.role !== 'owner') {
      throw new ForbiddenException('Cannot modify owner account');
    }

    const groupIdToAssign = dto.groupId ?? targetUser?.groupId ?? null;

    // Check if promoting to leader - ensure team selected and only one leader per team
    if (dto.role === 'leader') {
      if (!groupIdToAssign) {
        throw new ForbiddenException('Leader must belong to a team');
      }
      const existingLeader = await this.usersService.findLeaderByGroup(groupIdToAssign);
      if (existingLeader && existingLeader.id !== id) {
        throw new ForbiddenException(`Team already has a leader: ${existingLeader.name}. Please remove the current leader first.`);
      }
    }

    // Check team capacity if assigning to a new team (max 10 members per team)
    if (dto.groupId && dto.groupId !== targetUser?.groupId) {
      const currentMemberCount = await this.usersService.countMembersByGroup(dto.groupId);
      if (currentMemberCount >= 10) {
        throw new ForbiddenException('Team is full. Maximum 10 members allowed per team.');
      }
    }
    
    const user = await this.usersService.updateRole(id, dto.role, dto.groupId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Patch(':id/approve')
  @Roles('leader')
  async approveUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    // First, get the user to approve
    const userToApprove = await this.usersService.findOne(id);
    if (!userToApprove) {
      throw new NotFoundException('User not found');
    }

    // Leaders must belong to a team and can only approve users in their own group
    if (!currentUser.groupId || !userToApprove.groupId) {
      throw new ForbiddenException('Leader must belong to a team to approve users');
    }
    if (userToApprove.groupId !== currentUser.groupId) {
      throw new ForbiddenException('You can only approve users in your own group');
    }

    // Check team member capacity (max 10 members)
    const currentMemberCount = await this.usersService.countMembersByGroup(userToApprove.groupId);
    if (currentMemberCount >= 10) {
      throw new ForbiddenException('Team is full. Maximum 10 members allowed per team.');
    }

    return this.usersService.approveUser(id);
  }

  @Delete(':id/reject')
  @Roles('leader')
  async rejectUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    // First, get the user to reject
    const userToReject = await this.usersService.findOne(id);
    if (!userToReject) {
      throw new NotFoundException('User not found');
    }

    // Leaders must belong to a team and can only reject users in their own group
    if (!currentUser.groupId || !userToReject.groupId) {
      throw new ForbiddenException('Leader must belong to a team to reject users');
    }
    if (userToReject.groupId !== currentUser.groupId) {
      throw new ForbiddenException('You can only reject users in your own group');
    }

    return this.usersService.remove(id);
  }

  @Patch(':id/join-team')
  async joinTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('groupId') groupId: string,
    @CurrentUser() currentUser: any,
  ) {
    // User can only change their own team, or admin/owner can change others
    if (id !== currentUser.id && currentUser.role !== 'admin' && currentUser.role !== 'owner') {
      throw new ForbiddenException('You can only change your own team');
    }

    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (groupId && groupId !== user.groupId) {
      const currentMemberCount = await this.usersService.countMembersByGroup(groupId);
      if (currentMemberCount >= 10) {
        throw new ForbiddenException('Team is full. Maximum 10 members allowed per team.');
      }
    }

    // When changing teams, reset approval status
    const updatedUser = await this.usersService.updateGroupAndResetApproval(id, groupId);

    // If user was leader, remove leader role
    if (user.role === 'leader') {
      await this.usersService.updateRole(id, 'member');
    }

    return this.usersService.findOne(id);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.remove(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
