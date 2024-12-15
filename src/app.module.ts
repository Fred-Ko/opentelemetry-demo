import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { UsersModule } from 'src/users/users.module';
import { UserReadEntity } from './users/entities/user-read.entity';
import { UserEntity } from './users/entities/user.entity';

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
      entities: [UserEntity],
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
      entities: [UserReadEntity],
      synchronize: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    UsersModule,
  ],
})
export class AppModule {}
