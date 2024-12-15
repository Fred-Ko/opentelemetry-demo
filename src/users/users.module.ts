import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partitioners } from 'kafkajs';
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { DeleteUserHandler } from './commands/handlers/delete-user.handler';
import { UpdateUserHandler } from './commands/handlers/update-user.handler';
import { UserProjectionController } from './controller/user-projection.controller';
import { UserRead } from './entities/user-read.entity';
import { User } from './entities/user.entity';
import { GetUsersHandler } from './queries/handlers/get-users.handler';
import { UsersCommandResolver } from './users.command.resolver';
import { UsersQueryResolver } from './users.query.resolver';

const CommandHandlers = [
  CreateUserHandler,
  UpdateUserHandler,
  DeleteUserHandler,
];
const QueryHandlers = [GetUsersHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([User], 'write'),
    TypeOrmModule.forFeature([UserRead], 'read'),
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'user-service',
            brokers: ['localhost:9092'],
          },
          producer: {
            createPartitioner: Partitioners.DefaultPartitioner,
            allowAutoTopicCreation: true,
          },
        },
      },
    ]),
  ],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    UsersCommandResolver,
    UsersQueryResolver,
  ],
  controllers: [UserProjectionController],
})
export class UsersModule {}
