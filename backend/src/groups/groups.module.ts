import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [DatabaseModule, SubmissionsModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
