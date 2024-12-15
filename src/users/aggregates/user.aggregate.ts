import { AggregateRoot } from '@nestjs/cqrs';

export class UserAggregate extends AggregateRoot {
  private id: string;
  private name: string;
  private email: string;

  constructor(id?: string) {
    super();
    if (id) {
      this.id = id;
    }
  }

  registerUser(id: string, name: string, email: string) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  updateUser(newName: string, newEmail: string) {
    this.name = newName;
    this.email = newEmail;
  }

  getUserId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }
}
