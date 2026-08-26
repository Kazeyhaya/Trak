"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritosModule = void 0;
var common_1 = require("@nestjs/common");
var favoritos_controller_1 = require("./favoritos.controller");
var favoritos_service_1 = require("./favoritos.service");
var FavoritosModule = (function () {
    function FavoritosModule() {
    }
    FavoritosModule = __decorate([
        (0, common_1.Module)({
            controllers: [favoritos_controller_1.FavoritosController],
            providers: [favoritos_service_1.FavoritosService]
        })
    ], FavoritosModule);
    return FavoritosModule;
}());
exports.FavoritosModule = FavoritosModule;
//# sourceMappingURL=favoritos.module.js.map