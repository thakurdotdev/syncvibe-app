/**
 *  @summary Clamps a node with a lower and upper bound.
 *  @example
    clamp(-1, 0, 100); // 0
    clamp(1, 0, 100); // 1
    clamp(101, 0, 100); // 100
  * @worklet
  */
export const clamp = (value, lowerBound, upperBound) => {
  'worklet';

  return Math.min(Math.max(lowerBound, value), upperBound);
};
//# sourceMappingURL=math.js.map