"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
var common_1 = require("@nestjs/common");
var supabase_js_1 = require("@supabase/supabase-js");
var SupabaseService = (function () {
    function SupabaseService() {
        this.client = null;
    }
    SupabaseService.prototype.getClient = function () {
        if (this.client) {
            return this.client;
        }
        var url = process.env.SUPABASE_URL;
        var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceRoleKey) {
            throw new common_1.InternalServerErrorException("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
        }
        this.client = (0, supabase_js_1.createClient)(url, serviceRoleKey, {
            auth: { persistSession: false }
        });
        return this.client;
    };
    SupabaseService = __decorate([
        (0, common_1.Injectable)()
    ], SupabaseService);
    return SupabaseService;
}());
exports.SupabaseService = SupabaseService;
//# sourceMappingURL=supabase.service.js.map