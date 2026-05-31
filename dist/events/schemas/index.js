"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_EVENT_SCHEMAS = void 0;
exports.getEventSchema = getEventSchema;
__exportStar(require("./platform-bus"), exports);
__exportStar(require("./business-bus"), exports);
const platform_bus_1 = require("./platform-bus");
const business_bus_1 = require("./business-bus");
exports.ALL_EVENT_SCHEMAS = {
    ...platform_bus_1.PLATFORM_BUS_SCHEMAS,
    ...business_bus_1.BUSINESS_BUS_SCHEMAS,
};
/** Look up the Zod schema for a given eventType. Returns undefined for unknown types. */
function getEventSchema(eventType) {
    return exports.ALL_EVENT_SCHEMAS[eventType];
}
//# sourceMappingURL=index.js.map