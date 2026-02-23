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
    // Only owner can promote to admin or change owner role
    if (dto.role === 'admin' || dto.role === 'owner') {
      if (currentUser.role !== 'owner') {
        throw new ForbiddenException('Only owner can manage admin accounts');
      }
    }
    
    // Prevent changing owner account
    const targetUser = await this.usersService.findOne(id);
    if (targetUser?.role === 'owner' && currentUser.role !== 'owner') {
      throw new ForbiddenException('Cannot modify owner account');
    }
    
    const user = await this.usersService.updateRole(id, dto.role);
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

    // Check if the current user is the leader of the same group
    if (userToApprove.groupId !== currentUser.groupId) {
      throw new ForbiddenException('You can only approve users in your own group');
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

    // Check if the current user is the leader of the same group
    if (userToReject.groupId !== currentUser.groupId) {
      throw new ForbiddenException('You can only reject users in your own group');
    }

    return this.usersService.remove(id);
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
