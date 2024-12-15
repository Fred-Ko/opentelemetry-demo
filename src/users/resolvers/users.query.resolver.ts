import { QueryBus } from '@nestjs/cqrs';
import { Query, Resolver } from '@nestjs/graphql';
import { UserRead } from 'src/users/entities/user-read.entity';
import { GetUsersQuery } from '../queries/impl/get-users.query';

@Resolver(() => UserRead)
export class UsersQueryResolver {
  constructor(private readonly queryBus: QueryBus) {}

  @Query(() => [UserRead])
  async users() {
    return this.queryBus.execute(new GetUsersQuery());
  }
}
