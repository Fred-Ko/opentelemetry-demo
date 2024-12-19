import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TracingService } from 'src/monitoring/TracingService';
import { TracingInterceptor } from './TracingInterceptor';

@Module({
  imports: [DiscoveryModule],
  providers: [TracingInterceptor, TracingService],
  exports: [TracingInterceptor],
})
export class TracingModule {}
