import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { UsersModule } from 'src/users/users.module';
import { UserReadEntity } from './users/entities/user-read.entity';
import { UserEntity } from './users/entities/user.entity';
import { OtelNestTracingModule } from '@fredko/nestjs-opentelemetry-tracing';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      name: 'write',
      type: 'postgres',
      host: process.env.DB_WRITE_HOST,
      port: parseInt(process.env.DB_WRITE_PORT, 10),
      username: process.env.DB_WRITE_USERNAME,
      password: process.env.DB_WRITE_PASSWORD,
      database: process.env.DB_WRITE_DATABASE,
      entities: [UserEntity],
      synchronize: true,
    }),
    TypeOrmModule.forRoot({
      name: 'read',
      type: 'postgres',
      host: process.env.DB_READ_HOST,
      port: parseInt(process.env.DB_READ_PORT, 10),
      username: process.env.DB_READ_USERNAME,
      password: process.env.DB_READ_PASSWORD,
      database: process.env.DB_READ_DATABASE,
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
    DiscoveryModule,
    OtelNestTracingModule.forRoot({
      dirInclusionPatterns: [/src/],
      classNameIncludePatterns: [/Handler/, /Controller/, /Resolver/],
      classNameExcludePatterns: [],
      methodNameIncludePatterns: [],
      methodNameExcludePatterns: [],
    }),
  ],
  providers: [],
})
export class AppModule {}
