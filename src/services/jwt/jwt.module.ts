// modules/jwt/jwt.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from './jwt.service';

@Global() // Make JwtService available globally
@Module({
    imports: [ConfigModule],
    providers: [JwtService],
    exports: [JwtService], // Export so other modules can use it
})
export class JwtModule {}