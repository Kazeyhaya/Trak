"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuarioLogado = void 0;
var common_1 = require("@nestjs/common");
exports.UsuarioLogado = (0, common_1.createParamDecorator)(function (_data, ctx) {
    var request = ctx.switchToHttp().getRequest();
    return request.usuarioAuth;
});
//# sourceMappingURL=usuario-auth.decorator.js.map