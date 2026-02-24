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
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from '../users/users.service';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly submissionsService: SubmissionsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const group = await this.groupsService.findOne(id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('member', 'leader', 'admin')
  async findSubmissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const user = await this.usersService.findOne(req.user.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isElevated = user.role === 'owner' || user.role === 'admin';
    if (!isElevated) {
      if (user.role !== 'member' && user.role !== 'leader') {
        throw new ForbiddenException('You are not allowed to view submissions');
      }
      if (!user.groupId || user.groupId !== id) {
        throw new ForbiddenException('You can only view submissions from your group');
      }
    }
    return this.submissionsService.findByGroupId(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    const group = await this.groupsService.update(id, dto);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const group = await this.groupsService.remove(id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }
}
