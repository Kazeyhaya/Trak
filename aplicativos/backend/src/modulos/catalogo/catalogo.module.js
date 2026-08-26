"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogoModule = void 0;
var common_1 = require("@nestjs/common");
var catalogo_controller_1 = require("./catalogo.controller");
var catalogo_service_1 = require("./catalogo.service");
var CatalogoModule = (function () {
    function CatalogoModule() {
    }
    CatalogoModule = __decorate([
        (0, common_1.Module)({
            controllers: [catalogo_controller_1.CatalogoController],
            providers: [catalogo_service_1.CatalogoService],
            exports: [catalogo_service_1.CatalogoService]
        })
    ], CatalogoModule);
    return CatalogoModule;
}());
exports.CatalogoModule = CatalogoModule;
//# sourceMappingURL=catalogo.module.js.map