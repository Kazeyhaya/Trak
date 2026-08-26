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
exports.CatalogoController = void 0;
var common_1 = require("@nestjs/common");
var catalogo_service_1 = require("./catalogo.service");
var CatalogoController = (function () {
    function CatalogoController(catalogoService) {
        this.catalogoService = catalogoService;
    }
    CatalogoController.prototype.listar = function () {
        return this.catalogoService.listar();
    };
    CatalogoController.prototype.buscarPorId = function (id) {
        return this.catalogoService.buscarPorId(id);
    };
    __decorate([
        (0, common_1.Get)(),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], CatalogoController.prototype, "listar", null);
    __decorate([
        (0, common_1.Get)(":id"),
        __param(0, (0, common_1.Param)("id")),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", void 0)
    ], CatalogoController.prototype, "buscarPorId", null);
    CatalogoController = __decorate([
        (0, common_1.Controller)("catalogo"),
        __metadata("design:paramtypes", [catalogo_service_1.CatalogoService])
    ], CatalogoController);
    return CatalogoController;
}());
exports.CatalogoController = CatalogoController;
//# sourceMappingURL=catalogo.controller.js.map