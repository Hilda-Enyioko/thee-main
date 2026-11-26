import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DistributorTeamController, ProviderTeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [AuthModule],
  controllers: [ProviderTeamController, DistributorTeamController],
  providers: [TeamService],
})
export class TeamModule {}
