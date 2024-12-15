export class UserCreatedEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
  ) {}
} 