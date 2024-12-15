import { CommandBus } from '@nestjs/cqrs';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CreateUserCommand } from '../commands/create-user.command';
import { DeleteUserCommand } from '../commands/delete-user.command';
import { UpdateUserCommand } from '../commands/update-user.command';
import { User } from 'src/users/graphql/user.type';


@Resolver(() => User)
export class UsersCommandResolver {
  constructor(private readonly commandBus: CommandBus) {}

  @Mutation(() => User)
  async createUser(
    @Args('name') name: string,
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    return this.commandBus.execute(
      new CreateUserCommand(name, email, password),
    );
  }

  @Mutation(() => User)
  async updateUser(
    @Args('id') id: string,
    @Args('name', { nullable: true }) name?: string,
    @Args('email', { nullable: true }) email?: string,
  ) {
    return this.commandBus.execute(new UpdateUserCommand(id, name, email));
  }

  @Mutation(() => Boolean)
  async deleteUser(@Args('id') id: string) {
    await this.commandBus.execute(new DeleteUserCommand(id));
    return true;
  }
}
