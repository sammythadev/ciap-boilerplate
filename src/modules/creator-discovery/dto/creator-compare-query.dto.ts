import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatorCompareQueryDto {
  @ApiPropertyOptional({
    description: 'Comma-separated creator user IDs to compare.',
    example: '12,18',
  })
  @IsOptional()
  @IsString()
  creatorIds?: string;

  @ApiPropertyOptional({
    description:
      'Search query to compare top matches when creatorIds is empty.',
    example: 'gaming',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Maximum creators to compare when using search.',
    example: 5,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
