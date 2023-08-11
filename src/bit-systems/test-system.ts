import { defineQuery } from "bitecs";
import { Object3DTag } from "../bit-components";
import { TestComponent } from "../components/test-component";
import { HubsWorld } from "../app";

const velocityQuery = defineQuery([TestComponent, Object3DTag]);
export function TestSystem(world: HubsWorld) {
  velocityQuery(world).forEach(eid => {
      const obj = world.eid2obj.get(eid)!;

      obj.position.x += TestComponent.x[eid];
      obj.position.y += TestComponent.y[eid];
      obj.position.z += TestComponent.z[eid];

      obj.updateMatrix();
  });
}