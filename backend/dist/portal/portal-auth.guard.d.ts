declare const PortalAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class PortalAuthGuard extends PortalAuthGuard_base {
}
export declare const CurrentPortalUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
export {};
