"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogoService = void 0;
var common_1 = require("@nestjs/common");
var CatalogoService = (function () {
    function CatalogoService() {
    }
    CatalogoService.prototype.getReleaseYear = function (date) {
        var year = date === null || date === void 0 ? void 0 : date.slice(0, 4);
        return year && /^\d{4}$/.test(year) ? Number(year) : null;
    };
    CatalogoService.prototype.fetchJson = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var response, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 5, , 6]);
                        return [4, fetch(url)];
                    case 1:
                        response = _c.sent();
                        if (!response.ok) return [3, 3];
                        return [4, response.json()];
                    case 2:
                        _a = (_c.sent());
                        return [3, 4];
                    case 3:
                        _a = null;
                        _c.label = 4;
                    case 4: return [2, _a];
                    case 5:
                        _b = _c.sent();
                        return [2, null];
                    case 6: return [2];
                }
            });
        });
    };
    CatalogoService.prototype.listarTmdb = function (mediaType, type, apiKey) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4, this.fetchJson("https://api.themoviedb.org/3/trending/".concat(mediaType, "/week?api_key=").concat(encodeURIComponent(apiKey), "&language=pt-BR"))];
                    case 1:
                        data = _b.sent();
                        return [2, ((_a = data === null || data === void 0 ? void 0 : data.results) !== null && _a !== void 0 ? _a : []).slice(0, 8).map(function (item) {
                                var _a, _b, _c;
                                return ({
                                    id: "tmdb_".concat(type.toLowerCase(), "_").concat(item.id),
                                    externalId: String(item.id),
                                    source: "tmdb",
                                    type: type,
                                    title: (_b = (_a = item.title) !== null && _a !== void 0 ? _a : item.name) !== null && _b !== void 0 ? _b : "Sem titulo",
                                    coverUrl: item.poster_path ? "https://image.tmdb.org/t/p/w500".concat(item.poster_path) : null,
                                    synopsis: item.overview || null,
                                    releaseYear: _this.getReleaseYear((_c = item.release_date) !== null && _c !== void 0 ? _c : item.first_air_date)
                                });
                            })];
                }
            });
        });
    };
    CatalogoService.prototype.listarRawg = function (apiKey) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4, this.fetchJson("https://api.rawg.io/api/games?key=".concat(encodeURIComponent(apiKey), "&page_size=8&ordering=-added"))];
                    case 1:
                        data = _b.sent();
                        return [2, ((_a = data === null || data === void 0 ? void 0 : data.results) !== null && _a !== void 0 ? _a : []).map(function (item) { return ({
                                id: "rawg_game_".concat(item.id),
                                externalId: String(item.id),
                                source: "rawg",
                                type: "GAME",
                                title: item.name,
                                coverUrl: item.background_image,
                                synopsis: null,
                                releaseYear: _this.getReleaseYear(item.released)
                            }); })];
                }
            });
        });
    };
    CatalogoService.prototype.listar = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tmdbApiKey, rawgApiKey, _a, movies, series, games;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        tmdbApiKey = process.env.TMDB_API_KEY;
                        rawgApiKey = process.env.RAWG_API_KEY;
                        if (!tmdbApiKey && !rawgApiKey) {
                            throw new common_1.ServiceUnavailableException("Configure TMDB_API_KEY ou RAWG_API_KEY no ambiente.");
                        }
                        return [4, Promise.all([
                                tmdbApiKey ? this.listarTmdb("movie", "MOVIE", tmdbApiKey) : [],
                                tmdbApiKey ? this.listarTmdb("tv", "SERIES", tmdbApiKey) : [],
                                rawgApiKey ? this.listarRawg(rawgApiKey) : []
                            ])];
                    case 1:
                        _a = _b.sent(), movies = _a[0], series = _a[1], games = _a[2];
                        return [2, __spreadArray(__spreadArray(__spreadArray([], movies, true), series, true), games, true)];
                }
            });
        });
    };
    CatalogoService.prototype.buscarPorId = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, source, type, externalId, apiKey, mediaType, item, _b, apiKey, item, _c;
            var _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _a = id.split("_"), source = _a[0], type = _a[1], externalId = _a[2];
                        if (!(source === "tmdb" && (type === "movie" || type === "series"))) return [3, 4];
                        apiKey = process.env.TMDB_API_KEY;
                        mediaType = type === "movie" ? "movie" : "tv";
                        if (!apiKey) return [3, 2];
                        return [4, this.fetchJson("https://api.themoviedb.org/3/".concat(mediaType, "/").concat(encodeURIComponent(externalId), "?api_key=").concat(encodeURIComponent(apiKey), "&language=pt-BR"))];
                    case 1:
                        _b = _g.sent();
                        return [3, 3];
                    case 2:
                        _b = null;
                        _g.label = 3;
                    case 3:
                        item = _b;
                        if (item) {
                            return [2, {
                                    id: id,
                                    externalId: externalId,
                                    source: "tmdb",
                                    type: type === "movie" ? "MOVIE" : "SERIES",
                                    title: (_e = (_d = item.title) !== null && _d !== void 0 ? _d : item.name) !== null && _e !== void 0 ? _e : "Sem titulo",
                                    coverUrl: item.poster_path ? "https://image.tmdb.org/t/p/w500".concat(item.poster_path) : null,
                                    synopsis: item.overview || null,
                                    releaseYear: this.getReleaseYear((_f = item.release_date) !== null && _f !== void 0 ? _f : item.first_air_date)
                                }];
                        }
                        _g.label = 4;
                    case 4:
                        if (!(source === "rawg" && type === "game")) return [3, 8];
                        apiKey = process.env.RAWG_API_KEY;
                        if (!apiKey) return [3, 6];
                        return [4, this.fetchJson("https://api.rawg.io/api/games/".concat(encodeURIComponent(externalId), "?key=").concat(encodeURIComponent(apiKey)))];
                    case 5:
                        _c = _g.sent();
                        return [3, 7];
                    case 6:
                        _c = null;
                        _g.label = 7;
                    case 7:
                        item = _c;
                        if (item) {
                            return [2, {
                                    id: id,
                                    externalId: externalId,
                                    source: "rawg",
                                    type: "GAME",
                                    title: item.name,
                                    coverUrl: item.background_image,
                                    synopsis: item.description_raw || null,
                                    releaseYear: this.getReleaseYear(item.released)
                                }];
                        }
                        _g.label = 8;
                    case 8: throw new common_1.NotFoundException("Item nao encontrado.");
                }
            });
        });
    };
    CatalogoService = __decorate([
        (0, common_1.Injectable)()
    ], CatalogoService);
    return CatalogoService;
}());
exports.CatalogoService = CatalogoService;
//# sourceMappingURL=catalogo.service.js.map