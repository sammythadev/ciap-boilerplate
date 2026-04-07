import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Get a user by ID
   * @throws NotFoundException if user does not exist
   */
  async getUserById(id: number): Promise<UserDto> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapUserToDto(user);
  }

  /**
   * Get a user by email
   * @throws NotFoundException if user does not exist
   */
  async getUserByEmail(email: string): Promise<UserDto> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return this.mapUserToDto(user);
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(limit = 10, offset = 0): Promise<UserDto[]> {
    const users = await this.usersRepository.findAll(limit, offset);
    return users.map((user) => this.mapUserToDto(user));
  }

  /**
   * Map user entity to DTO (excludes sensitive fields)
   */
  private mapUserToDto(user: any): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
