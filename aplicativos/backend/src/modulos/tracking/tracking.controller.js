"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingController = void 0;
var common_1 = require("@nestjs/common");
var supabase_auth_guard_1 = require("../../comum/autenticacao/supabase-auth.guard");
var usuario_auth_decorator_1 = require("../../comum/autenticacao/usuario-auth.decorator");
var tracking_service_1 = require("./tracking.service");
var TrackingPayloadDto = (function () {
    function TrackingPayloadDto() {
    }
    return TrackingPayloadDto;
}());
var TrackingController = (function () {
    function TrackingController(trackingService) {
        this.trackingService = trackingService;
    }
    TrackingController.prototype.listar = function (usuario) {
        return this.trackingService.listar(usuario.id);
    };
    TrackingController.prototype.salvar = function (usuario, mediaItemId, payload) {
        return this.trackingService.salvar(usuario.id, mediaItemId, payload);
    };
    TrackingController.prototype.atualizar = function (usuario, mediaItemId, payload) {
        return this.trackingService.salvar(usuario.id, mediaItemId, payload);
    };
    __decorate([
        (0, common_1.Get)(),
        __param(0, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], TrackingController.prototype, "listar", null);
    __decorate([
        (0, common_1.Post)("items/:mediaItemId"),
        __param(0, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __param(1, (0, common_1.Param)("mediaItemId")),
        __param(2, (0, common_1.Body)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object, String, TrackingPayloadDto]),
        __metadata("design:returntype", void 0)
    ], TrackingController.prototype, "salvar", null);
    __decorate([
        (0, common_1.Put)("items/:mediaItemId"),
        __param(0, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __param(1, (0, common_1.Param)("mediaItemId")),
        __param(2, (0, common_1.Body)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object, String, TrackingPayloadDto]),
        __metadata("design:returntype", void 0)
    ], TrackingController.prototype, "atualizar", null);
    TrackingController = __decorate([
        (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
        (0, common_1.Controller)("tracking"),
        __metadata("design:paramtypes", [tracking_service_1.TrackingService])
    ], TrackingController);
    return TrackingController;
}());
exports.TrackingController = TrackingController;
//# sourceMappingURL=tracking.controller.js.map