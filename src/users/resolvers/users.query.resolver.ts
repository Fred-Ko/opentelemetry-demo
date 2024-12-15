import { Query, Resolver } from '@nestjs/graphql';
import { UserRead } from '../graphql/user-read.type';
import { GetUsersQuery } from '../queries/get-users.query';
import { GetUsersHandler } from '../queries/handlers/get-users.handler';

@Resolver(() => UserRead)
export class UsersQueryResolver {
  constructor(private readonly getUsersHandler: GetUsersHandler) {}

  @Query(() => [UserRead])
  async getUsers() {
    return this.getUsersHandler.execute(new GetUsersQuery());
  }
}
