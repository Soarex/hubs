import { addComponent, defineComponent, Types } from "bitecs";
import { HubsWorld } from "../app";
import { addObject3DComponent } from "../utils/jsx-entity";
import { Mesh, PlaneGeometry } from "three";
import * as THREE from "three";
import Hyperbeam from "@hyperbeam/web";

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

let texture : THREE.Texture;
texture = new THREE.Texture();
texture.flipY = true;
texture.generateMipmaps = false;

async function getUrl() {
  let embedURL = "" // Running locally and you have an embed URL? Set it here
  if (embedURL === "") {
    const room = location.pathname.substring(1)
    const req = await fetch("https://demo-api.tutturu.workers.dev/" + room)
    if (req.status >= 400) {
      alert("We are out of demo servers! Visit hyperbeam.dev to get your own API key")
      return
    }
    const body = await req.json()
    if (body.room !== room) {
      history.replaceState(null, "", "/" + body.room + location.search)
    }
    return body.url
  }
}

async function GetHyperbeamTexture() {
  const embedURL = await getUrl();

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setClearColor(0xFF889B, 1)
  renderer.setSize(window.innerWidth, window.innerHeight)

  const hbContainer = document.getElementById("hb-container") as HTMLDivElement
  console.log(`Connecting to: ${embedURL}`);
  const hb = await Hyperbeam(hbContainer, embedURL, {
    frameCb: (frame) => {
      if (texture.image === null) {
        if (frame.constructor === HTMLVideoElement) {
          frame.width = frame.videoWidth
          frame.height = frame.videoHeight
        }

        texture.image = frame
        texture.needsUpdate = true
      } else {
        renderer.copyTextureToTexture(new THREE.Vector2(0, 0), new THREE.Texture(frame as HTMLVideoElement), texture)
      }
    },
    audioTrackCb: (track) => {}
  })
}

export function inflateTestComponent(
    world: HubsWorld,
    eid: number,
    params: TestComponentParams
) {

  GetHyperbeamTexture();

  addComponent(world, TestComponent, eid);

  TestComponent.x[eid] = params.x ?? DEFAULTS.x;
  TestComponent.y[eid] = params.y ?? DEFAULTS.y;
  TestComponent.z[eid] = params.z ?? DEFAULTS.z;

  const width = 9;
  const height = width * (9 / 16);
  const geometry = new PlaneGeometry(width, height);
  geometry.rotateZ(Math.PI);
  geometry.rotateY(Math.PI);

  const material = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
  const mesh = new Mesh(
    geometry,
    material
  );

  addObject3DComponent(APP.world, eid, mesh);
}