"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clamp = void 0;
/**
 *  @summary Clamps a node with a lower and upper bound.
 *  @example
    clamp(-1, 0, 100); // 0
    clamp(1, 0, 100); // 1
    clamp(101, 0, 100); // 100
  * @worklet
  */
const clamp = (value, lowerBound, upperBound) => {
  'worklet';

  return Math.min(Math.max(lowerBound, value), upperBound);
};
exports.clamp = clamp;
//# sourceMappingURL=math.js.map