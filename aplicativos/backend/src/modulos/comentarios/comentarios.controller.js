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
exports.ComentariosController = void 0;
var common_1 = require("@nestjs/common");
var supabase_auth_guard_1 = require("../../comum/autenticacao/supabase-auth.guard");
var usuario_auth_decorator_1 = require("../../comum/autenticacao/usuario-auth.decorator");
var comentarios_service_1 = require("./comentarios.service");
var criar_comentario_dto_1 = require("./dto/criar-comentario.dto");
var denunciar_comentario_dto_1 = require("./dto/denunciar-comentario.dto");
var listar_comentarios_query_dto_1 = require("./dto/listar-comentarios-query.dto");
var ComentariosController = (function () {
    function ComentariosController(comentariosService) {
        this.comentariosService = comentariosService;
    }
    ComentariosController.prototype.listar = function (query, usuario) {
        return this.comentariosService.listarPorMidia(query.mediaItemId, usuario.id);
    };
    ComentariosController.prototype.criar = function (payload, usuario) {
        return this.comentariosService.criar(payload.mediaItemId, usuario.id, payload.content);
    };
    ComentariosController.prototype.curtir = function (id, usuario) {
        return this.comentariosService.curtir(id, usuario.id);
    };
    ComentariosController.prototype.descurtir = function (id, usuario) {
        return this.comentariosService.descurtir(id, usuario.id);
    };
    ComentariosController.prototype.denunciar = function (id, payload, usuario) {
        return this.comentariosService.denunciar(id, usuario.id, payload);
    };
    __decorate([
        (0, common_1.Get)(),
        __param(0, (0, common_1.Query)()),
        __param(1, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [listar_comentarios_query_dto_1.ListarComentariosQueryDto, Object]),
        __metadata("design:returntype", void 0)
    ], ComentariosController.prototype, "listar", null);
    __decorate([
        (0, common_1.Post)(),
        __param(0, (0, common_1.Body)()),
        __param(1, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [criar_comentario_dto_1.CriarComentarioDto, Object]),
        __metadata("design:returntype", void 0)
    ], ComentariosController.prototype, "criar", null);
    __decorate([
        (0, common_1.Post)(":id/curtidas"),
        __param(0, (0, common_1.Param)("id")),
        __param(1, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object]),
        __metadata("design:returntype", void 0)
    ], ComentariosController.prototype, "curtir", null);
    __decorate([
        (0, common_1.Delete)(":id/curtidas"),
        __param(0, (0, common_1.Param)("id")),
        __param(1, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object]),
        __metadata("design:returntype", void 0)
    ], ComentariosController.prototype, "descurtir", null);
    __decorate([
        (0, common_1.Post)(":id/denuncias"),
        __param(0, (0, common_1.Param)("id")),
        __param(1, (0, common_1.Body)()),
        __param(2, (0, usuario_auth_decorator_1.UsuarioLogado)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, denunciar_comentario_dto_1.DenunciarComentarioDto, Object]),
        __metadata("design:returntype", void 0)
    ], ComentariosController.prototype, "denunciar", null);
    ComentariosController = __decorate([
        (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
        (0, common_1.Controller)("comentarios"),
        __metadata("design:paramtypes", [comentarios_service_1.ComentariosService])
    ], ComentariosController);
    return ComentariosController;
}());
exports.ComentariosController = ComentariosController;
//# sourceMappingURL=comentarios.controller.js.map