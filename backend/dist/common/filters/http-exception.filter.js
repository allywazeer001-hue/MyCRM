"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger('ExceptionFilter');
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errors;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string') {
                message = body;
            }
            else if (typeof body === 'object' && body !== null) {
                const b = body;
                message = b.message ?? b.error ?? 'Request failed';
                if (Array.isArray(b.message)) {
                    errors = b.message;
                    message = 'Validation failed';
                }
            }
        }
        else if (exception instanceof Error) {
            this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
            const msg = exception.message || '';
            if (msg.includes('Unique constraint')) {
                status = common_1.HttpStatus.CONFLICT;
                message = 'A record with that value already exists';
            }
            else if (msg.includes('Foreign key constraint')) {
                status = common_1.HttpStatus.BAD_REQUEST;
                message = 'Referenced record does not exist';
            }
            else if (msg.includes('does not exist in the current database')) {
                status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
                message = 'Database schema out of sync — run prisma migrate dev';
            }
        }
        response.status(status).json({
            statusCode: status,
            message,
            ...(errors ? { errors } : {}),
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map