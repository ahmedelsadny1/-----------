import { Module } from '@nestjs/common';
import { TerminalsService } from './terminals.service.js';
import { TerminalsController } from './terminals.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [TerminalsController],
  providers: [TerminalsService],
  exports: [TerminalsService],
})
export class TerminalsModule {}
