import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class UserRead {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  isActive: boolean;

  @Field()
  lastUpdated: Date;
} 