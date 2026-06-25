import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    checkEmail(email: string): Promise<{
        exists: boolean;
        firstName?: undefined;
        organizationName?: undefined;
    } | {
        exists: boolean;
        firstName: string;
        organizationName: any;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(user: any): Promise<void>;
    changePassword(user: any, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    getProfile(user: any): Promise<any>;
}
