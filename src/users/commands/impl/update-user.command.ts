export class UpdateUserCommand {
  constructor(
    public readonly userId: string,
    public readonly newName: string,
    public readonly newEmail: string,
  ) {}
} 