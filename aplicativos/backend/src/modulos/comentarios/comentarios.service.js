"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.ComentariosService = void 0;
var common_1 = require("@nestjs/common");
var node_crypto_1 = require("node:crypto");
var supabase_service_1 = require("../../comum/supabase/supabase.service");
var ComentariosService = (function () {
    function ComentariosService(supabaseService) {
        this.supabaseService = supabaseService;
    }
    ComentariosService.prototype.resolverUserId = function (authUserId) {
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
    ComentariosService.prototype.listarPorMidia = function (mediaItemId, authUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, userId, _a, comentarios, error, comentarioIds, likesCount, likesDoUsuario, _b, likes, likesError, _i, _c, like, commentId;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        supabase = this.supabaseService.getClient();
                        return [4, this.resolverUserId(authUserId)];
                    case 1:
                        userId = _e.sent();
                        return [4, supabase
                                .from("Comment")
                                .select("id,userId,mediaItemId,content,createdAt,updatedAt")
                                .eq("mediaItemId", mediaItemId)
                                .order("createdAt", { ascending: false })];
                    case 2:
                        _a = _e.sent(), comentarios = _a.data, error = _a.error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        comentarioIds = (comentarios !== null && comentarios !== void 0 ? comentarios : []).map(function (c) { return c.id; });
                        likesCount = new Map();
                        likesDoUsuario = new Set();
                        if (!(comentarioIds.length > 0)) return [3, 4];
                        return [4, supabase
                                .from("CommentLike")
                                .select("commentId,userId")
                                .in("commentId", comentarioIds)];
                    case 3:
                        _b = _e.sent(), likes = _b.data, likesError = _b.error;
                        if (likesError) {
                            throw new common_1.InternalServerErrorException(likesError.message);
                        }
                        for (_i = 0, _c = likes !== null && likes !== void 0 ? likes : []; _i < _c.length; _i++) {
                            like = _c[_i];
                            commentId = like.commentId;
                            likesCount.set(commentId, ((_d = likesCount.get(commentId)) !== null && _d !== void 0 ? _d : 0) + 1);
                            if (like.userId === userId) {
                                likesDoUsuario.add(commentId);
                            }
                        }
                        _e.label = 4;
                    case 4: return [2, (comentarios !== null && comentarios !== void 0 ? comentarios : []).map(function (comentario) {
                            var _a;
                            return (__assign(__assign({}, comentario), { likesCount: (_a = likesCount.get(comentario.id)) !== null && _a !== void 0 ? _a : 0, likedByUser: likesDoUsuario.has(comentario.id) }));
                        })];
                }
            });
        });
    };
    ComentariosService.prototype.criar = function (mediaItemId, authUserId, content) {
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
                                .from("Comment")
                                .insert({
                                id: (0, node_crypto_1.randomUUID)(),
                                mediaItemId: mediaItemId,
                                userId: userId,
                                content: content
                            })
                                .select("id,userId,mediaItemId,content,createdAt,updatedAt")
                                .single()];
                    case 2:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        return [2, __assign(__assign({}, data), { likesCount: 0, likedByUser: false })];
                }
            });
        });
    };
    ComentariosService.prototype.curtir = function (comentarioId, authUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, userId, _a, comentario, comentarioError, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        supabase = this.supabaseService.getClient();
                        return [4, this.resolverUserId(authUserId)];
                    case 1:
                        userId = _b.sent();
                        return [4, supabase
                                .from("Comment")
                                .select("id")
                                .eq("id", comentarioId)
                                .maybeSingle()];
                    case 2:
                        _a = _b.sent(), comentario = _a.data, comentarioError = _a.error;
                        if (comentarioError) {
                            throw new common_1.InternalServerErrorException(comentarioError.message);
                        }
                        if (!comentario) {
                            throw new common_1.NotFoundException("Comentario nao encontrado.");
                        }
                        return [4, supabase.from("CommentLike").upsert({
                                id: (0, node_crypto_1.randomUUID)(),
                                commentId: comentarioId,
                                userId: userId
                            }, {
                                onConflict: "commentId,userId",
                                ignoreDuplicates: false
                            })];
                    case 3:
                        error = (_b.sent()).error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        return [2, this.contarCurtidas(comentarioId)];
                }
            });
        });
    };
    ComentariosService.prototype.descurtir = function (comentarioId, authUserId) {
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
                                .from("CommentLike")
                                .delete()
                                .eq("commentId", comentarioId)
                                .eq("userId", userId)];
                    case 2:
                        error = (_a.sent()).error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        return [2, this.contarCurtidas(comentarioId)];
                }
            });
        });
    };
    ComentariosService.prototype.contarCurtidas = function (comentarioId) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, _a, count, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        supabase = this.supabaseService.getClient();
                        return [4, supabase
                                .from("CommentLike")
                                .select("id", { count: "exact", head: true })
                                .eq("commentId", comentarioId)];
                    case 1:
                        _a = _b.sent(), count = _a.count, error = _a.error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        return [2, {
                                commentId: comentarioId,
                                likesCount: count !== null && count !== void 0 ? count : 0
                            }];
                }
            });
        });
    };
    ComentariosService.prototype.denunciar = function (comentarioId, authUserId, payload) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, reporterUserId, _a, comentario, comentarioError, _b, existente, existenteError, _c, data, error;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        supabase = this.supabaseService.getClient();
                        return [4, this.resolverUserId(authUserId)];
                    case 1:
                        reporterUserId = _d.sent();
                        return [4, supabase
                                .from("Comment")
                                .select("id")
                                .eq("id", comentarioId)
                                .maybeSingle()];
                    case 2:
                        _a = _d.sent(), comentario = _a.data, comentarioError = _a.error;
                        if (comentarioError) {
                            throw new common_1.InternalServerErrorException(comentarioError.message);
                        }
                        if (!comentario) {
                            throw new common_1.NotFoundException("Comentario nao encontrado.");
                        }
                        return [4, supabase
                                .from("CommentReport")
                                .select("id,commentId,reporterUserId,reason,details,status,createdAt")
                                .eq("commentId", comentarioId)
                                .eq("reporterUserId", reporterUserId)
                                .maybeSingle()];
                    case 3:
                        _b = _d.sent(), existente = _b.data, existenteError = _b.error;
                        if (existenteError) {
                            throw new common_1.InternalServerErrorException(existenteError.message);
                        }
                        if (existente) {
                            return [2, existente];
                        }
                        return [4, supabase
                                .from("CommentReport")
                                .insert({
                                id: (0, node_crypto_1.randomUUID)(),
                                commentId: comentarioId,
                                reporterUserId: reporterUserId,
                                reason: payload.reason,
                                details: payload.details
                            })
                                .select("id,commentId,reporterUserId,reason,details,status,createdAt")
                                .single()];
                    case 4:
                        _c = _d.sent(), data = _c.data, error = _c.error;
                        if (error) {
                            throw new common_1.InternalServerErrorException(error.message);
                        }
                        return [2, data];
                }
            });
        });
    };
    ComentariosService = __decorate([
        (0, common_1.Injectable)(),
        __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
    ], ComentariosService);
    return ComentariosService;
}());
exports.ComentariosService = ComentariosService;
//# sourceMappingURL=comentarios.service.js.map