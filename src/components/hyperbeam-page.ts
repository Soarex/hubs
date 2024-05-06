import { addComponent, defineComponent, Types } from "bitecs";
import { HubsWorld } from "../app";
import { addObject3DComponent } from "../utils/jsx-entity";
import { Mesh, PlaneGeometry } from "three";
import * as THREE from "three";

export const HyperbeamPage = defineComponent({
  hyperbeamObjectId: Types.i16,
  width: Types.f32,
  height: Types.f32
});

export const Focused = defineComponent();

export type HyperbeamPageParams = {
};

export function inflateHyperbeamPage(
    world: HubsWorld,
    eid: number,
    params: HyperbeamPageParams
) {
  addComponent(world, HyperbeamPage, eid);

  HyperbeamPage.hyperbeamObjectId[eid] = 0;

  const width = 9;
  const height = width * (9 / 16);
  const geometry = new PlaneGeometry(width, height);
  geometry.rotateZ(Math.PI);
  geometry.rotateY(Math.PI);

  HyperbeamPage.width[eid] = width;
  HyperbeamPage.height[eid] = height;

  const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
  const mesh = new Mesh(
    geometry,
    material
  );

  addObject3DComponent(APP.world, eid, mesh);
}