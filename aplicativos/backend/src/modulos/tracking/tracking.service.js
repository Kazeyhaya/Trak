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
exports.TrackingService = void 0;
var common_1 = require("@nestjs/common");
var node_crypto_1 = require("node:crypto");
var supabase_service_1 = require("../../comum/supabase/supabase.service");
var TrackingService = (function () {
    function TrackingService(supabaseService) {
        this.supabaseService = supabaseService;
    }
    TrackingService.prototype.resolverUserId = function (authUserId) {
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
                        return [2, (data === null || data === void 0 ? void 0 : data.id) ? data.id : authUserId];
                }
            });
        });
    };
    TrackingService.prototype.listar = function (authUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, userId, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        supabase = this.supabaseService.getClient();
                        return [4, this.resolverUserId(authUserId)];
                    case 1:
                        userId = _b.sent();
                        return [4, supabase
                                .from("TrackingItem")
                                .select("id,mediaItemId,status,progress,favorite,updatedAt")
                                .eq("userId", userId)
                                .order("updatedAt", { ascending: false })];
                    case 2:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        return [2, data !== null && data !== void 0 ? data : []];
                }
            });
        });
    };
    TrackingService.prototype.salvar = function (authUserId, mediaItemId, payload) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, userId, nextPayload, _a, data, error;
            var _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        supabase = this.supabaseService.getClient();
                        return [4, this.resolverUserId(authUserId)];
                    case 1:
                        userId = _e.sent();
                        nextPayload = {
                            id: (0, node_crypto_1.randomUUID)(),
                            userId: userId,
                            mediaItemId: mediaItemId,
                            status: (_b = payload.status) !== null && _b !== void 0 ? _b : "WANT",
                            progress: (_c = payload.progress) !== null && _c !== void 0 ? _c : 0,
                            favorite: (_d = payload.favorite) !== null && _d !== void 0 ? _d : false,
                            updatedAt: new Date().toISOString()
                        };
                        return [4, supabase
                                .from("TrackingItem")
                                .upsert(nextPayload, {
                                onConflict: "userId,mediaItemId",
                                ignoreDuplicates: false
                            })
                                .select("id,mediaItemId,status,progress,favorite,updatedAt")
                                .single()];
                    case 2:
                        _a = _e.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        return [2, data];
                }
            });
        });
    };
    TrackingService = __decorate([
        (0, common_1.Injectable)(),
        __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
    ], TrackingService);
    return TrackingService;
}());
exports.TrackingService = TrackingService;
//# sourceMappingURL=tracking.service.js.map