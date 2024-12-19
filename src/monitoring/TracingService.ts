import {
  Injectable,
  NestInterceptor,
  OnModuleInit,
  UseInterceptors,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, ModuleRef } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { TracingInterceptor } from './TracingInterceptor';

@Injectable()
export class TracingService implements OnModuleInit {
  private readonly ClassNamePattern: string[] = ['*Handler'];
  private readonly ClassNameSkipPattern: string[] = [];
  private readonly MethodNamePattern: string[] = ['*'];
  private readonly MethodNameSkipPattern: string[] = [];
  private readonly tracingInterceptor: NestInterceptor;

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef,
  ) {
    this.tracingInterceptor = this.moduleRef.get(TracingInterceptor);
  }

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    providers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;
      if (!instance) return;

      const className = instance.constructor.name;

      if (
        this.matchesPattern(className, this.ClassNamePattern) &&
        !this.matchesPattern(className, this.ClassNameSkipPattern)
      ) {
        const prototype = Object.getPrototypeOf(instance);
        const methodNames = this.metadataScanner.getAllMethodNames(prototype);

        methodNames.forEach((methodName: string) => {
          if (
            this.matchesPattern(methodName, this.MethodNamePattern) &&
            !this.matchesPattern(methodName, this.MethodNameSkipPattern)
          ) {
            const descriptor = Object.getOwnPropertyDescriptor(
              prototype,
              methodName,
            );
            if (!descriptor || typeof descriptor.value !== 'function') return;

            UseInterceptors(this.tracingInterceptor)(
              prototype,
              methodName,
              descriptor,
            );

            console.log(
              `TracingInterceptor 적용됨: ${className}.${methodName}`,
            );
          }
        });
      }
    });
  }

  private matchesPattern(name: string, patterns: string[]): boolean {
    return patterns.some((pattern) => this.match(name, pattern));
  }

  private match(name: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(name);
  }
}
