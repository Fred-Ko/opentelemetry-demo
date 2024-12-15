// 기술 스택
// - nestjs
// - kafkajs
// - typeorm
// - postgres
// - graphql

// layerd architecture
// port and adapter pattern
// cqrs pattern
// event sourcing
// user 생성, 조회, 수정, 삭제

// command -> kafka -> read model projection -> 조회
// 위에 요구사항에 맞게 코드 만들어줘.
// @https://docs.nestjs.com/recipes/cqrs

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Partitioners } from 'kafkajs';
import { AppModule } from './app.module';

async function bootstrap() {
  NestFactory.createApplicationContext
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'user-projection-service',
          brokers: ['localhost:9092'],
        },
        consumer: {
          groupId: 'user-projection-group',
        },
        producer: {
          createPartitioner: Partitioners.DefaultPartitioner,
          allowAutoTopicCreation: true,
        },
      },
    },
    { inheritAppConfig: true },
  );
  await app.startAllMicroservices();

  await app.listen(3333);
}

bootstrap();
