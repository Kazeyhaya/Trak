"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var app_controller_1 = require("./app.controller");
var app_service_1 = require("./app.service");
var supabase_module_1 = require("./comum/supabase/supabase.module");
var catalogo_module_1 = require("./modulos/catalogo/catalogo.module");
var comentarios_module_1 = require("./modulos/comentarios/comentarios.module");
var favoritos_module_1 = require("./modulos/favoritos/favoritos.module");
var tracking_module_1 = require("./modulos/tracking/tracking.module");
var AppModule = (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        (0, common_1.Module)({
            imports: [supabase_module_1.SupabaseModule, catalogo_module_1.CatalogoModule, comentarios_module_1.ComentariosModule, favoritos_module_1.FavoritosModule, tracking_module_1.TrackingModule],
            controllers: [app_controller_1.AppController],
            providers: [app_service_1.AppService]
        })
    ], AppModule);
    return AppModule;
}());
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map