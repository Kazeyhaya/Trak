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
exports.FavoritosController = void 0;
var common_1 = require("@nestjs/common");
var supabase_auth_guard_1 = require("../../comum/autenticacao/supabase-auth.guard");
var usuario_auth_decorator_1 = require("../../comum/autenticacao/usuario-auth.decorator");
var adicionar_favorito_dto_1 = require("./dto/adicionar-favorito.dto");
var favoritos_service_1 = require("./favoritos.service");
var FavoritosController = (function () {
    function FavoritosController(favoritosService) {
        this.favoritosService = favoritosService;
    }
    FavoritosController.prototype.listar = function (usuario) {
        return this.favoritosService.listar(usuario.id);
    };
    FavoritosController.prototype.adicionar = function (usuario, payload) {
        return this.favoritosService.adicionar(usuario.id, payload.mediaItemId);
    };
    FavoritosController.prototype.remover = function (usuario, mediaItemId) {
        return this.favoritosService.remover(usuario.id, mediaItemId);
    };
    __decorate([
        (0, common_1.Get)(),
        __param(0, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], FavoritosController.prototype, "listar", null);
    __decorate([
        (0, common_1.Post)(),
        __param(0, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __param(1, (0, common_1.Body)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object, adicionar_favorito_dto_1.AdicionarFavoritoDto]),
        __metadata("design:returntype", void 0)
    ], FavoritosController.prototype, "adicionar", null);
    __decorate([
        (0, common_1.Delete)(":mediaItemId"),
        __param(0, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __param(1, (0, common_1.Param)("mediaItemId")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object, String]),
        __metadata("design:returntype", void 0)
    ], FavoritosController.prototype, "remover", null);
    FavoritosController = __decorate([
        (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
        (0, common_1.Controller)("favoritos"),
        __metadata("design:paramtypes", [favoritos_service_1.FavoritosService])
    ], FavoritosController);
    return FavoritosController;
}());
exports.FavoritosController = FavoritosController;
//# sourceMappingURL=favoritos.controller.js.map