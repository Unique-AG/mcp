import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { OAUTH_ENDPOINTS } from '../constants/oauth.constants';
import { RegisterClientDto } from '../dtos/register-client.dto';
import { ClientService } from '../services/client.service';

@Controller()
@UseGuards(ThrottlerGuard)
export class ClientController {
  public constructor(private readonly clientService: ClientService) {}

  @Post(OAUTH_ENDPOINTS.register)
  @UsePipes(ZodValidationPipe)
  public async registerClient(@Body() registerClientDto: RegisterClientDto) {
    return this.clientService.registerClient(registerClientDto);
  }
}
