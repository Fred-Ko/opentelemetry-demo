import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetUsersQuery } from '../impl/get-users.query';
import { UserRead } from '../../entities/user-read.entity';

@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(
    @InjectRepository(UserRead, 'read')
    private userReadRepository: Repository<UserRead>,
  ) {}

  async execute(query: GetUsersQuery) {
    return this.userReadRepository.find();
  }
} 