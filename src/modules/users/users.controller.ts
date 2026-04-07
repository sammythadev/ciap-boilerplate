import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserDto } from './dto/user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get a user by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'User with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  async getUser(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return this.usersService.getUserById(id);
  }

  /**
   * Get all users with pagination
   */
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of users to return',
    type: Number,
    required: false,
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of users to skip',
    type: Number,
    required: false,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    type: [UserDto],
  })
  async getAllUsers(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<UserDto[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    return this.usersService.getAllUsers(parsedLimit, parsedOffset);
  }
}
