import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { UserRead } from './users/entities/user-read.entity';

import { Events } from 'src/users/entities/event.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      name: 'write',
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'postgres',
      password: 'postgres',
      database: 'write_db',
      entities: [Events],
      synchronize: true,
    }),
    TypeOrmModule.forRoot({
      name: 'read',
      type: 'postgres',
      host: 'localhost',
      port: 5435,
      username: 'postgres',
      password: 'postgres',
      database: 'read_db',
      entities: [UserRead],
      synchronize: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'graphql', 'schema.gql'),
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    UsersModule,
  ],
})
export class AppModule {}
