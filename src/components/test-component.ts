import { addComponent, defineComponent, Types } from "bitecs";
import { HubsWorld } from "../app";

export const TestComponent = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32
});

export type TestComponentParams = {
  x?: number;
  y?: number;
  z?: number;
};

const DEFAULTS: Required<TestComponentParams> = {
  x: 0.0,
  y: 0.0,
  z: 0.0
};

export function inflateTestComponent(
    world: HubsWorld,
    eid: number,
    params: TestComponentParams
) {
  addComponent(world, TestComponent, eid);

  TestComponent.x[eid] = params.x ?? DEFAULTS.x;
  TestComponent.y[eid] = params.y ?? DEFAULTS.y;
  TestComponent.z[eid] = params.z ?? DEFAULTS.z;
}