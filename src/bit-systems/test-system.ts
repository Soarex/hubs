import { defineQuery } from "bitecs";
import { Object3DTag } from "../bit-components";
import { TestComponent } from "../components/test-component";
import { HubsWorld } from "../app";
import * as THREE from "three"
import Hyperbeam from "@hyperbeam/web";

const testQuery = defineQuery([TestComponent, Object3DTag]);

export function TestSystem(world: HubsWorld) {
  testQuery(world).forEach(eid => {
      const obj = world.eid2obj.get(eid)! as THREE.Mesh;

      //obj.position.x += TestComponent.x[eid];
      //obj.position.y = 2;
      //obj.position.z += TestComponent.z[eid];

      obj.updateMatrix();
  });
}