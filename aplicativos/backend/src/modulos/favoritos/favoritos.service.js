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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritosService = void 0;
var common_1 = require("@nestjs/common");
var node_crypto_1 = require("node:crypto");
var supabase_service_1 = require("../../comum/supabase/supabase.service");
var FavoritosService = (function () {
    function FavoritosService(supabaseService) {
        this.supabaseService = supabaseService;
    }
    FavoritosService.prototype.resolverUserId = function (authUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        supabase = this.supabaseService.getClient();
                        return [4, supabase
                                .from("User")
                                .select("id")
                                .eq("authUserId", authUserId)
                                .maybeSingle()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        if (data === null || data === void 0 ? void 0 : data.id) {
                            return [2, data.id];
                        }
                        return [2, authUserId];
                }
            });
        });
    };
    FavoritosService.prototype.listar = function (authUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, userId, _a, favoritos, error, mediaIds, _b, itens, itensError, mapa;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        supabase = this.supabaseService.getClient();
                        return [4, this.resolverUserId(authUserId)];
                    case 1:
                        userId = _c.sent();
                        return [4, supabase
                                .from("Favorite")
                                .select("mediaItemId,createdAt")
                                .eq("userId", userId)
                                .order("createdAt", { ascending: false })];
                    case 2:
                        _a = _c.sent(), favoritos = _a.data, error = _a.error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        mediaIds = (favoritos !== null && favoritos !== void 0 ? favoritos : []).map(function (f) { return f.mediaItemId; });
                        if (mediaIds.length === 0) {
                            return [2, []];
                        }
                        return [4, supabase
                                .from("MediaItem")
                                .select("id,externalId,source,type,title,coverUrl,synopsis,releaseYear")
                                .in("id", mediaIds)];
                    case 3:
                        _b = _c.sent(), itens = _b.data, itensError = _b.error;
                        if (itensError) {
                            throw new common_1.InternalServerErrorException(itensError.message);
                        }
                        mapa = new Map((itens !== null && itens !== void 0 ? itens : []).map(function (item) { return [item.id, item]; }));
                        return [2, favoritos === null || favoritos === void 0 ? void 0 : favoritos.map(function (fav) {
                                var _a;
                                return ({
                                    mediaItemId: fav.mediaItemId,
                                    createdAt: fav.createdAt,
                                    item: (_a = mapa.get(fav.mediaItemId)) !== null && _a !== void 0 ? _a : null
                                });
                            })];
                }
            });
        });
    };
    FavoritosService.prototype.adicionar = function (authUserId, mediaItemId) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, userId, error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        supabase = this.supabaseService.getClient();
                        return [4, this.resolverUserId(authUserId)];
                    case 1:
                        userId = _a.sent();
                        return [4, supabase.from("Favorite").upsert({
                                id: (0, node_crypto_1.randomUUID)(),
                                userId: userId,
                                mediaItemId: mediaItemId
                            }, {
                                onConflict: "userId,mediaItemId",
                                ignoreDuplicates: false
                            })];
                    case 2:
                        error = (_a.sent()).error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        return [2, { ok: true }];
                }
            });
        });
    };
    FavoritosService.prototype.remover = function (authUserId, mediaItemId) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, userId, error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        supabase = this.supabaseService.getClient();
                        return [4, this.resolverUserId(authUserId)];
                    case 1:
                        userId = _a.sent();
                        return [4, supabase
                                .from("Favorite")
                                .delete()
                                .eq("userId", userId)
                                .eq("mediaItemId", mediaItemId)];
                    case 2:
                        error = (_a.sent()).error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        return [2, { ok: true }];
                }
            });
        });
    };
    FavoritosService = __decorate([
        (0, common_1.Injectable)(),
        __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
    ], FavoritosService);
    return FavoritosService;
}());
exports.FavoritosService = FavoritosService;
//# sourceMappingURL=favoritos.service.js.map